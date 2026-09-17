import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { FileIcon } from "@/components/file-list";
import { DeleteFileButton } from "@/components/files/delete-file-button";
import { FileFilters } from "@/components/files/file-filters";
import { UploadButton } from "@/components/files/upload-dialog";
import { Icon } from "@/components/icons";
import { UserChip } from "@/components/ui/avatar";
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
      <PageHeader title="ファイル" sub={`${total}件 · 合計 ${fileSize(totalBytes)}。案件・顧客に紐づけて保存し、同じ名前は版として重ねます`}>
        {can(me, "file") ? <UploadButton options={options} /> : null}
      </PageHeader>
      <Suspense>
        <FileFilters kinds={kinds} projects={options.projects} customers={options.customers} />
      </Suspense>

      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <SortHeader label="ファイル名" field="name" {...sortProps} />
              <th className="th">関連</th>
              <th className="th text-right">版</th>
              <SortHeader label="サイズ" field="size" {...sortProps} className="text-right" />
              <SortHeader label="追加者" field="uploader" {...sortProps} />
              <SortHeader label="追加日時" field="created" {...sortProps} />
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}><Empty>該当するファイルがありません</Empty></td>
              </tr>
            ) : (
              rows.map((f) => (
                <tr key={f.id} className="tr-link">
                  <td className="td">
                    <span className="flex items-center gap-2.5">
                      <FileIcon name={f.name} size={30} />
                      <a href={`/api/files/${f.id}`} className="font-bold hover:underline" title="ダウンロード">{f.name}</a>
                    </span>
                  </td>
                  <td className="td">
                    {f.project ? <Link href={`/projects/${f.project.id}`} className="text-primary hover:underline">{f.project.name}</Link> : null}
                    {f.customer ? <div className={`text-xs ${f.project ? "text-muted" : ""}`}>{f.project ? f.customer.name : <Link href={`/customers/${f.customer.id}`} className="text-primary hover:underline">{f.customer.name}</Link>}</div> : null}
                  </td>
                  <td className="td tnum text-right font-mono text-xs">v{f.version}</td>
                  <td className="td tnum text-right whitespace-nowrap">{fileSize(f.size)}</td>
                  <td className="td"><UserChip user={f.uploader} /></td>
                  <td className="td tnum whitespace-nowrap">{fmtDateTime(f.createdAt)}</td>
                  <td className="td">
                    <span className="flex justify-end gap-0.5">
                      <a href={`/api/files/${f.id}`} aria-label="ダウンロード" title="ダウンロード" className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
                        <Icon name="download" size={15} />
                      </a>
                      {can(me, "file") ? <DeleteFileButton id={f.id} name={f.name} version={f.version} /> : null}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
        <span>{total ? `${(page - 1) * PER_PAGE + 1}〜${Math.min(page * PER_PAGE, total)}件 / ${total}件` : ""}</span>
        <Pagination page={page} pageCount={pageCount} makeHref={(p) => makeHref({ page: String(p) })} />
      </div>
    </div>
  );
}
