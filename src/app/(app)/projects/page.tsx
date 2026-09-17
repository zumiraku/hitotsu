import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { Icon } from "@/components/icons";
import { Board, type BoardCard } from "@/components/projects/board";
import { ProjectFilters } from "@/components/projects/project-filters";
import { UserChip } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Flash } from "@/components/ui/flash";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SortHeader } from "@/components/ui/sort-header";
import { db } from "@/lib/db";
import { daysLeft, dueLabel, fmtDate, yen } from "@/lib/format";
import { PRIORITY_LABEL, STATUS_ORDER, isClosed } from "@/lib/labels";
import { projectAlerts } from "@/lib/project-alerts";

export const metadata = { title: "案件" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;
const SORTS: Record<string, (dir: "asc" | "desc") => Prisma.ProjectOrderByWithRelationInput[]> = {
  updated: (dir) => [{ updatedAt: dir }],
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
    owner: { select: { name: true, color: true } },
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
  const filtering = !!(q || statusParam || owner || customer);

  const cards: BoardCard[] = enriched.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    customerName: p.customer.name.replace(/(株式会社|合同会社|有限会社|医療法人)/g, "").trim(),
    owner: p.owner,
    dueLabel: p.dueDate ? fmtDate(p.dueDate).slice(5) : null,
    overdue: !isClosed(p.status) && !!p.dueDate && daysLeft(p.dueDate) < 0,
    openTasks: p.open,
    alertCount: p.alerts.length,
    alertLevel: p.alerts.some((a) => a.level === "bad") ? "bad" : p.alerts.length ? "warn" : null,
  }));

  return (
    <div>
      <PageHeader title="案件" sub={`${total}件${filtering ? "（絞り込み中）" : ""}`}>
        <Link href="/projects/new" className="btn btn-primary">＋ 案件を追加</Link>
      </PageHeader>
      <Suspense>
        <Flash messages={{ deleted: "削除しました" }} />
        <ProjectFilters users={users} customers={customers} />
      </Suspense>

      {view === "board" ? (
        <Board cards={cards} />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <SortHeader label="案件名" field="name" {...sortProps} />
                  <SortHeader label="顧客" field="customer" {...sortProps} />
                  <SortHeader label="ステータス" field="status" {...sortProps} />
                  <SortHeader label="優先度" field="priority" {...sortProps} />
                  <SortHeader label="担当" field="owner" {...sortProps} />
                  <SortHeader label="納期" field="due" {...sortProps} />
                  <SortHeader label="金額" field="amount" {...sortProps} className="text-right" />
                  <th className="th text-right">タスク</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {enriched.length === 0 ? (
                  <tr>
                    <td colSpan={9}><Empty>該当する案件がありません</Empty></td>
                  </tr>
                ) : (
                  enriched.map((p) => {
                    const closed = isClosed(p.status);
                    const n = p.dueDate ? daysLeft(p.dueDate) : null;
                    return (
                      <tr key={p.id} className="tr-link">
                        <td className="td">
                          <Link href={`/projects/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
                          <div className="font-mono text-xs text-muted">{p.code}</div>
                        </td>
                        <td className="td">{p.customer.name}</td>
                        <td className="td"><StatusBadge status={p.status} /></td>
                        <td className="td whitespace-nowrap">
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-[2px] align-middle ${p.priority === "HIGH" ? "bg-bad" : p.priority === "MID" ? "bg-warn" : "bg-neutral"}`} />
                          {PRIORITY_LABEL[p.priority]}
                        </td>
                        <td className="td"><UserChip user={p.owner} /></td>
                        <td className="td tnum whitespace-nowrap">
                          {!p.dueDate ? <span className="text-muted">—</span> : closed ? <span className="text-muted">{fmtDate(p.dueDate)}</span> : (
                            <span className={n !== null && n < 0 ? "text-bad" : ""}>
                              {fmtDate(p.dueDate)}
                              <div className={`text-[11px] ${n !== null && n < 0 ? "font-bold text-bad" : n !== null && n <= 3 ? "font-bold text-warn" : "text-muted"}`}>{dueLabel(p.dueDate)}</div>
                            </span>
                          )}
                        </td>
                        <td className="td tnum text-right">{yen(p.amount)}</td>
                        <td className="td tnum text-right whitespace-nowrap">{p.open}<span className="text-xs text-muted">/{p.tasks.length}</span></td>
                        <td className="td">
                          {p.alerts.length ? (
                            <span className={`badge ${p.alerts.some((a) => a.level === "bad") ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`} title={p.alerts.map((a) => a.text).join(" / ")}>
                              <Icon name="alert" size={12} />{p.alerts.length}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
            <span>{total ? `${(page - 1) * PER_PAGE + 1}〜${Math.min(page * PER_PAGE, total)}件 / ${total}件` : ""}</span>
            <Pagination page={page} pageCount={pageCount} makeHref={(p) => makeHref({ page: String(p) })} />
          </div>
        </>
      )}
    </div>
  );
}
