import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { Board, type BoardCard } from "@/components/projects/board";
import { ProjectFilters } from "@/components/projects/project-filters";
import { StatusLabel } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Flash } from "@/components/ui/flash";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SortHeader } from "@/components/ui/sort-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { daysLeft, dueLabel, fmtDate, yen } from "@/lib/format";
import { PRIORITY_LABEL, STATUS_ORDER, isClosed } from "@/lib/labels";
import { projectAlerts } from "@/lib/project-alerts";

export const metadata = { title: "案件" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;
const SORTS: Record<string, (dir: "asc" | "desc") => Prisma.ProjectOrderByWithRelationInput[]> = {
  updated: (dir) => [{ updatedAt: dir }],
  code: (dir) => [{ code: dir }],
  name: (dir) => [{ name: dir }],
  customer: (dir) => [{ customer: { kana: dir } }, { name: "asc" }],
  status: (dir) => [{ status: dir }, { dueDate: "asc" }],
  priority: (dir) => [{ priority: dir }, { dueDate: "asc" }],
  owner: (dir) => [{ owner: { name: dir } }, { name: "asc" }],
  due: (dir) => [{ dueDate: { sort: dir, nulls: "last" } }],
  amount: (dir) => [{ amount: dir }],
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await currentUser();
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const statusParam = one(sp.status);
  const status = STATUS_ORDER.includes(statusParam as ProjectStatus) ? (statusParam as ProjectStatus) : undefined;
  const openOnly = statusParam === "open";
  const owner = one(sp.owner) || undefined;
  const customer = one(sp.customer) || undefined;
  const view = one(sp.view) === "board" ? "board" : "list";
  const sort = SORTS[one(sp.sort)] ? one(sp.sort) : "updated";
  const dir: "asc" | "desc" = one(sp.dir) ? (one(sp.dir) === "desc" ? "desc" : "asc") : sort === "updated" ? "desc" : "asc";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    ...(status ? { status } : openOnly ? { status: { in: ["LEAD", "ACTIVE", "HOLD"] } } : {}),
    ...(owner ? { OR: [{ ownerId: owner }, { members: { some: { userId: owner } } }] } : {}),
    ...(customer ? { customerId: customer } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { summary: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
                { tags: { has: q } },
              ],
            },
          ],
        }
      : {}),
  };

  const include = {
    customer: { select: { name: true } },
    owner: { select: { name: true } },
    tasks: { select: { done: true, dueDate: true } },
    activities: { orderBy: { occurredAt: "desc" as const }, take: 1, select: { occurredAt: true } },
  };

  const [total, projects, users, customers] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      include,
      orderBy: SORTS[sort](dir),
      ...(view === "list" ? { skip: (page - 1) * PER_PAGE, take: PER_PAGE } : {}),
    }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { kana: "asc" } }),
  ]);

  const enriched = projects.map((p) => {
    const overdueTasks = p.tasks.filter((t) => !t.done && t.dueDate && daysLeft(t.dueDate) < 0).length;
    const open = p.tasks.filter((t) => !t.done).length;
    const alerts = projectAlerts({ status: p.status, dueDate: p.dueDate, overdueTasks, lastActivityAt: p.activities[0]?.occurredAt ?? null });
    return { ...p, open, alerts };
  });

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const makeHref = (patch: Record<string, string>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (statusParam) next.set("status", statusParam);
    if (owner) next.set("owner", owner);
    if (customer) next.set("customer", customer);
    if (view === "board") next.set("view", "board");
    next.set("sort", sort);
    next.set("dir", dir);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (next.get("page") === "1") next.delete("page");
    return `/projects?${next.toString()}`;
  };
  const sortProps = { sort, dir, makeHref };
  const showAmount = can(me, "amount");

  const cards: BoardCard[] = enriched.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    status: p.status,
    customerName: p.customer.name,
    ownerName: p.owner?.name ?? null,
    dueText: p.dueDate ? fmtDate(p.dueDate) : null,
    overdue: !isClosed(p.status) && !!p.dueDate && daysLeft(p.dueDate) < 0,
    openTasks: p.open,
    alerts: p.alerts.map((a) => a.text),
  }));

  return (
    <div>
      <PageHeader title="案件一覧" sub={`${total}件`}>
        {can(me, "edit") ? <Link href="/projects/new" className="btn">新規登録</Link> : null}
      </PageHeader>
      <Suspense>
        <Flash messages={{ deleted: "削除しました。" }} />
        <ProjectFilters users={users} customers={customers} />
      </Suspense>

      {view === "board" ? (
        <Board cards={cards} canDrag={can(me, "edit")} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <SortHeader label="コード" field="code" {...sortProps} />
                  <SortHeader label="案件名" field="name" {...sortProps} />
                  <SortHeader label="顧客" field="customer" {...sortProps} />
                  <SortHeader label="ステータス" field="status" {...sortProps} />
                  <SortHeader label="優先度" field="priority" {...sortProps} />
                  <SortHeader label="担当" field="owner" {...sortProps} />
                  <SortHeader label="納期" field="due" {...sortProps} />
                  {showAmount ? <SortHeader label="金額" field="amount" {...sortProps} className="text-right" /> : null}
                  <th className="th text-right">未完了タスク</th>
                  <th className="th">要確認</th>
                </tr>
              </thead>
              <tbody>
                {enriched.length === 0 ? (
                  <tr>
                    <td colSpan={showAmount ? 10 : 9} className="td"><Empty>該当する案件はありません。</Empty></td>
                  </tr>
                ) : (
                  enriched.map((p) => {
                    const closed = isClosed(p.status);
                    const n = p.dueDate ? daysLeft(p.dueDate) : null;
                    return (
                      <tr key={p.id} className="tr-link">
                        <td className="td tnum whitespace-nowrap">{p.code}</td>
                        <td className="td">
                          <Link href={`/projects/${p.id}`}>{p.name}</Link>
                        </td>
                        <td className="td">{p.customer.name}</td>
                        <td className="td whitespace-nowrap"><StatusLabel status={p.status} /></td>
                        <td className={`td whitespace-nowrap text-center ${p.priority === "HIGH" ? "text-bad" : ""}`}>{PRIORITY_LABEL[p.priority]}</td>
                        <td className="td whitespace-nowrap">{p.owner?.name ?? <span className="text-muted">未割当</span>}</td>
                        <td className={`td tnum whitespace-nowrap ${!closed && n !== null && n < 0 ? "text-bad" : ""}`}>
                          {!p.dueDate ? <span className="text-muted">－</span> : (
                            <>
                              {fmtDate(p.dueDate)}
                              {!closed ? <span className="ml-1 text-[11px]">（{dueLabel(p.dueDate)}）</span> : null}
                            </>
                          )}
                        </td>
                        {showAmount ? <td className="td tnum whitespace-nowrap text-right">{yen(p.amount)}</td> : null}
                        <td className="td tnum whitespace-nowrap text-right">
                          {p.open} / {p.tasks.length}
                        </td>
                        <td className="td text-[12px]">
                          {p.alerts.length ? <span className={p.alerts.some((a) => a.level === "bad") ? "text-bad" : "text-warn"}>{p.alerts.map((a) => a.text).join("、")}</span> : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} perPage={PER_PAGE} makeHref={(p) => makeHref({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
