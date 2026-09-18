import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { DeleteFileButton } from "@/components/files/delete-file-button";
import { FileFilters } from "@/components/files/file-filters";
import { UploadButton } from "@/components/files/upload-dialog";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SortHeader } from "@/components/ui/sort-header";
import { activityOptions } from "@/lib/activity-options";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { liveRefs } from "@/lib/scope";
import { can } from "@/lib/permissions";
import { fileInclude } from "@/lib/files";
import { fileSize, fmtDateTime } from "@/lib/format";
import { extOf } from "@/lib/storage";

export const metadata = { title: "ファイル" };
export const dynamic = "force-dynamic";

const PER_PAGE = 30;
const SORTS: Record<string, (dir: "asc" | "desc") => Prisma.FileOrderByWithRelationInput[]> = {
  created: (dir) => [{ createdAt: dir }],
  name: (dir) => [{ name: dir }, { version: "desc" }],
  size: (dir) => [{ size: dir }],
  uploader: (dir) => [{ uploader: { name: dir } }, { createdAt: "desc" }],
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function FilesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await currentUser();
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const kind = one(sp.kind).toLowerCase();
  const project = one(sp.project) || undefined;
  const customer = one(sp.customer) || undefined;
  const allVersions = one(sp.all) === "1";
  const sort = SORTS[one(sp.sort)] ? one(sp.sort) : "created";
  const dir: "asc" | "desc" = one(sp.dir) ? (one(sp.dir) === "desc" ? "desc" : "asc") : sort === "created" || sort === "size" ? "desc" : "asc";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.FileWhereInput = {
    ...liveRefs,
    ...(project ? { projectId: project } : {}),
    ...(customer ? { customerId: customer } : {}),
    ...(kind ? { name: { endsWith: `.${kind}`, mode: "insensitive" } } : {}),
    ...(q ? { AND: [{ OR: [{ name: { contains: q, mode: "insensitive" } }, { project: { name: { contains: q, mode: "insensitive" } } }, { customer: { name: { contains: q, mode: "insensitive" } } }] }] } : {}),
  };

  const [all, options, kindsRaw] = await Promise.all([
    db.file.findMany({ where, include: fileInclude, orderBy: SORTS[sort](dir) }),
    activityOptions(),
    db.file.findMany({ select: { name: true }, distinct: ["name"] }),
  ]);

  // 既定では各ファイルの最新版だけを見せる
  const groupKey = (f: { projectId: string | null; customerId: string | null; name: string }) => `${f.projectId ?? ""}|${f.projectId ? "" : (f.customerId ?? "")}|${f.name}`;
  const latest = new Map<string, number>();
  for (const f of all) latest.set(groupKey(f), Math.max(latest.get(groupKey(f)) ?? 0, f.version));
  const files = allVersions ? all : all.filter((f) => latest.get(groupKey(f)) === f.version);
  const total = files.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const rows = files.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const kinds = [...new Set(kindsRaw.map((k) => extOf(k.name)).filter(Boolean))].sort();
  const totalBytes = all.reduce((s, f) => s + f.size, 0);

  const makeHref = (patch: Record<string, string>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (kind) next.set("kind", kind);
    if (project) next.set("project", project);
    if (customer) next.set("customer", customer);
    if (allVersions) next.set("all", "1");
    next.set("sort", sort);
    next.set("dir", dir);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (next.get("page") === "1") next.delete("page");
    return `/files?${next.toString()}`;
  };
  const sortProps = { sort, dir, makeHref };

  return (
    <div>
      <PageHeader title="ファイル一覧" sub={`${total}件（合計 ${fileSize(totalBytes)}）`}>
        {can(me, "file") ? <UploadButton options={options} /> : null}
      </PageHeader>
      <Suspense>
        <FileFilters kinds={kinds} projects={options.projects} customers={options.customers} />
      </Suspense>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <SortHeader label="ファイル名" field="name" {...sortProps} />
              <th className="th">案件</th>
              <th className="th">顧客</th>
              <th className="th text-right">版</th>
              <SortHeader label="サイズ" field="size" {...sortProps} className="text-right" />
              <SortHeader label="登録者" field="uploader" {...sortProps} />
              <SortHeader label="登録日時" field="created" {...sortProps} />
              <th className="th w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="td"><Empty>該当するファイルはありません。</Empty></td>
              </tr>
            ) : (
              rows.map((f) => (
                <tr key={f.id} className="tr-link">
                  <td className="td break-all">
                    <a href={`/api/files/${f.id}`} title="ダウンロード">{f.name}</a>
                  </td>
                  <td className="td">{f.project ? <Link href={`/projects/${f.project.id}`}>{f.project.name}</Link> : <span className="text-muted">－</span>}</td>
                  <td className="td">{f.customer ? <Link href={`/customers/${f.customer.id}`}>{f.customer.name}</Link> : <span className="text-muted">－</span>}</td>
                  <td className="td tnum text-right">{f.version}</td>
                  <td className="td tnum whitespace-nowrap text-right">{fileSize(f.size)}</td>
                  <td className="td whitespace-nowrap">{f.uploader?.name}</td>
                  <td className="td tnum whitespace-nowrap">{fmtDateTime(f.createdAt)}</td>
                  <td className="td whitespace-nowrap text-center text-[12.5px]">
                    <a href={`/api/files/${f.id}`}>ダウンロード</a>
                    {can(me, "file") ? (
                      <>
                        <span className="mx-1 text-muted">|</span>
                        <DeleteFileButton id={f.id} name={f.name} version={f.version} />
                      </>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} perPage={PER_PAGE} makeHref={(p) => makeHref({ page: String(p) })} />
    </div>
  );
}
