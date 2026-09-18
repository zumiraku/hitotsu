import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";
import { ACTION_LABEL, TARGET_LABEL, asChanges, ChangeList } from "@/components/audit-list";
import { AuditFilters } from "@/components/audit-filters";
import { Forbidden } from "@/components/forbidden";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata = { title: "変更履歴" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const ACTIONS = new Set(Object.keys(ACTION_LABEL));
type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function targetHref(type: string, id: string | null) {
  if (!id) return null;
  if (type === "project") return `/projects/${id}`;
  if (type === "customer") return `/customers/${id}`;
  if (type === "note") return `/notes#note-${id}`;
  if (type === "user") return "/users";
  return null;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await currentUser();
  if (!can(me, "audit")) return <Forbidden title="変更履歴" need="マネージャー以上" />;

  const sp = await searchParams;
  const q = one(sp.q).trim();
  const type = one(sp.type) || undefined;
  const user = one(sp.user) || undefined;
  const action = ACTIONS.has(one(sp.action)) ? (one(sp.action) as AuditAction) : undefined;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.from)) ? new Date(`${one(sp.from)}T00:00:00`) : undefined;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.to)) ? new Date(`${one(sp.to)}T23:59:59.999`) : undefined;
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(type ? { targetType: type } : {}),
    ...(user ? { userId: user } : {}),
    ...(action ? { action } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q ? { targetLabel: { contains: q, mode: "insensitive" } } : {}),
  };

  const [total, logs, users] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const makeHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, type, user, action, from: one(sp.from), to: one(sp.to) })) if (v) next.set(k, String(v));
    if (p > 1) next.set("page", String(p));
    return `/audit?${next.toString()}`;
  };

  return (
    <div>
      <PageHeader title="変更履歴" sub={`${total}件`} />
      <p className="mb-2 text-[12px] text-muted">※ 誰が・いつ・何を変更したかを自動で記録しています。</p>
      <Suspense>
        <AuditFilters users={users} />
      </Suspense>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="th">日時</th>
              <th className="th">ユーザー</th>
              <th className="th">操作</th>
              <th className="th">対象</th>
              <th className="th">変更内容</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="td"><Empty>該当する履歴はありません。</Empty></td>
              </tr>
            ) : (
              logs.map((l) => {
                const href = targetHref(l.targetType, l.targetId);
                return (
                  <tr key={l.id} className="tr-link align-top">
                    <td className="td tnum whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                    <td className="td whitespace-nowrap">{l.user?.name}</td>
                    <td className="td whitespace-nowrap">{ACTION_LABEL[l.action]}</td>
                    <td className="td">
                      <span className="mr-1 text-[11px] text-muted">［{TARGET_LABEL[l.targetType] ?? l.targetType}］</span>
                      {href ? <Link href={href}>{l.targetLabel}</Link> : l.targetLabel}
                    </td>
                    <td className="td min-w-[260px]">{asChanges(l.changes).length ? <ChangeList changes={asChanges(l.changes)} /> : <span className="text-muted">－</span>}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} perPage={PER_PAGE} makeHref={makeHref} />
    </div>
  );
}
