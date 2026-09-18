import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { CustomerType } from "@/generated/prisma/enums";
import { CustomerFilters } from "@/components/customers/customer-filters";
import { Tag, TypeLabel } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Flash } from "@/components/ui/flash";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SortHeader } from "@/components/ui/sort-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { fmtDate } from "@/lib/format";
import { ACTIVITY_LABEL } from "@/lib/labels";

export const metadata = { title: "顧客・取引先" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;
const TYPES = new Set(["CUSTOMER", "PARTNER", "BOTH"]);
const SORTS: Record<string, (dir: "asc" | "desc") => Prisma.CustomerOrderByWithRelationInput[]> = {
  name: (dir) => [{ kana: { sort: dir, nulls: "last" } }, { name: dir }],
  code: (dir) => [{ code: dir }],
  type: (dir) => [{ type: dir }, { kana: "asc" }],
  industry: (dir) => [{ industry: { sort: dir, nulls: "last" } }, { kana: "asc" }],
  owner: (dir) => [{ owner: { name: dir } }, { kana: "asc" }],
  projects: (dir) => [{ projects: { _count: dir } }, { kana: "asc" }],
  created: (dir) => [{ createdAt: dir }],
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await currentUser();
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const type = TYPES.has(one(sp.type)) ? (one(sp.type) as CustomerType) : undefined;
  const owner = one(sp.owner) || undefined;
  const sort = SORTS[one(sp.sort)] ? one(sp.sort) : "name";
  const dir: "asc" | "desc" = one(sp.dir) === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    ...(type ? { type } : {}),
    ...(owner ? { ownerId: owner } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { kana: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { industry: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
          ],
        }
      : {}),
  };

  const [total, customers, users] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: SORTS[sort](dir),
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        owner: { select: { name: true } },
        _count: { select: { projects: { where: { status: "ACTIVE", deletedAt: null } } } },
      },
    }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // 表示中の顧客だけ、最終対応を1件ずつ拾う
  const ids = customers.map((c) => c.id);
  const activities = ids.length
    ? await db.activity.findMany({
        where: { OR: [{ customerId: { in: ids } }, { project: { customerId: { in: ids }, deletedAt: null } }] },
        orderBy: { occurredAt: "desc" },
        select: { customerId: true, occurredAt: true, type: true, project: { select: { customerId: true } } },
        take: 500,
      })
    : [];
  const lastActivity = new Map<string, { occurredAt: Date; type: keyof typeof ACTIVITY_LABEL }>();
  for (const a of activities) {
    const cid = a.customerId ?? a.project?.customerId;
    if (cid && !lastActivity.has(cid)) lastActivity.set(cid, { occurredAt: a.occurredAt, type: a.type });
  }

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const makeHref = (patch: Record<string, string>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (type) next.set("type", type);
    if (owner) next.set("owner", owner);
    next.set("sort", sort);
    next.set("dir", dir);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (next.get("page") === "1") next.delete("page");
    return `/customers?${next.toString()}`;
  };
  const sortProps = { sort, dir, makeHref };

  return (
    <div>
      <PageHeader title="顧客・取引先一覧" sub={`${total}件`}>
        {can(me, "edit") ? <Link href="/customers/new" className="btn">新規登録</Link> : null}
      </PageHeader>
      <Suspense>
        <Flash messages={{ deleted: "削除しました。" }} />
        <CustomerFilters users={users} />
      </Suspense>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <SortHeader label="コード" field="code" {...sortProps} />
              <SortHeader label="会社名" field="name" {...sortProps} />
              <SortHeader label="種別" field="type" {...sortProps} />
              <SortHeader label="業種" field="industry" {...sortProps} />
              <th className="th">先方担当者</th>
              <th className="th">電話</th>
              <SortHeader label="社内担当" field="owner" {...sortProps} />
              <SortHeader label="進行中案件" field="projects" {...sortProps} className="text-right" />
              <th className="th">最終対応</th>
              <th className="th">タグ</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={10} className="td">
                  <Empty>該当する顧客・取引先はありません。</Empty>
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const last = lastActivity.get(c.id);
                return (
                  <tr key={c.id} className="tr-link">
                    <td className="td tnum whitespace-nowrap">{c.code}</td>
                    <td className="td">
                      <Link href={`/customers/${c.id}`}>{c.name}</Link>
                    </td>
                    <td className="td whitespace-nowrap"><TypeLabel type={c.type} /></td>
                    <td className="td">{c.industry || <span className="text-muted">－</span>}</td>
                    <td className="td whitespace-nowrap">
                      {c.contactName || <span className="text-muted">－</span>}
                      {c.contactTitle ? <span className="ml-1 text-[11px] text-muted">{c.contactTitle}</span> : null}
                    </td>
                    <td className="td tnum whitespace-nowrap">{c.tel || <span className="text-muted">－</span>}</td>
                    <td className="td whitespace-nowrap">{c.owner?.name ?? <span className="text-muted">未割当</span>}</td>
                    <td className="td tnum text-right">{c._count.projects}</td>
                    <td className="td tnum whitespace-nowrap">
                      {last ? (
                        <>
                          {fmtDate(last.occurredAt)}
                          <span className="ml-1 text-[11px] text-muted">{ACTIVITY_LABEL[last.type]}</span>
                        </>
                      ) : (
                        <span className="text-muted">－</span>
                      )}
                    </td>
                    <td className="td">{c.tags.map((t) => <Tag key={t}>{t}</Tag>)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} perPage={PER_PAGE} makeHref={(p) => makeHref({ page: String(p) })} />
    </div>
  );
}
