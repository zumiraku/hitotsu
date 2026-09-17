import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { Icon } from "@/components/icons";
import { Avatar, UserChip } from "@/components/ui/avatar";
import { CustomerTypeBadge, StatusBadge, Tag } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { db } from "@/lib/db";
import { ago, daysLeft, dueLabel, fileSize, fmtDate, fmtDateTime, yen } from "@/lib/format";
import { ACTIVITY_LABEL, PRIORITY_LABEL, STATUS_ORDER, isClosed } from "@/lib/labels";

export const dynamic = "force-dynamic";

const EXT_COLOR: Record<string, string> = { xlsx: "#1d7f49", xls: "#1d7f49", csv: "#1d7f49", docx: "#2a66a8", doc: "#2a66a8", pdf: "#b93b35", pptx: "#c8641e", zip: "#66727f", jpg: "#6b4a9e", jpeg: "#6b4a9e", png: "#6b4a9e", ai: "#d28a00" };
const ACTIVITY_ICON: Record<string, string> = { CALL: "phone", MAIL: "mail", VISIT: "pin", MEETING: "chat", MEMO: "memo" };
const ACTION_LABEL: Record<string, string> = { CREATE: "作成", UPDATE: "更新", DELETE: "削除", STATUS: "ステータス変更", ROLE: "権限変更", IMPORT: "CSV取込", EXPORT: "CSV出力", LOGIN: "ログイン" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.customer.findUnique({ where: { id }, select: { name: true } });
  return { title: c?.name ?? "顧客・取引先" };
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      owner: { select: { name: true, color: true } },
      projects: {
        where: { deletedAt: null },
        include: { owner: { select: { name: true, color: true } }, _count: { select: { tasks: { where: { done: false } } } } },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      },
      files: { include: { uploader: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();

  const [activities, logs] = await Promise.all([
    db.activity.findMany({
      where: { OR: [{ customerId: id }, { project: { customerId: id } }] },
      include: { user: { select: { name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
    db.auditLog.findMany({ where: { targetType: "customer", targetId: id }, include: { user: { select: { name: true, color: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const projects = [...c.projects].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const projectFiles = await db.file.findMany({
    where: { project: { customerId: id }, customerId: { not: id } },
    include: { uploader: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const files = [...c.files, ...projectFiles].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div>
      <Link href="/customers" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <span aria-hidden>←</span> 顧客・取引先一覧
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted">{c.code}</div>
          <h1 className="mb-1.5 mt-0.5 text-[22px] font-bold">{c.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-ink-2">
            <CustomerTypeBadge type={c.type} />
            {c.industry ? <span>{c.industry}</span> : null}
            <span className="inline-flex items-center gap-1">担当：<UserChip user={c.owner} /></span>
            {c.tags.length ? <span>{c.tags.map((t) => <Tag key={t}>{t}</Tag>)}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/customers/${c.id}/edit`} className="btn">編集</Link>
          <DeleteCustomerButton id={c.id} name={c.name} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">案件 <span className="ml-1 font-mono text-xs font-normal text-muted">{projects.length}</span></h2>
            </div>
            {projects.length === 0 ? (
              <Empty>案件はまだありません</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="th">案件名</th>
                      <th className="th">ステータス</th>
                      <th className="th">優先度</th>
                      <th className="th">担当</th>
                      <th className="th">納期</th>
                      <th className="th text-right">金額</th>
                      <th className="th text-right">未完了</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const closed = isClosed(p.status);
                      const n = p.dueDate ? daysLeft(p.dueDate) : null;
                      return (
                        <tr key={p.id} className="tr-link">
                          <td className="td">
                            <div className="font-bold">{p.name}</div>
                            <div className="font-mono text-xs text-muted">{p.code}</div>
                          </td>
                          <td className="td"><StatusBadge status={p.status} /></td>
                          <td className="td">
                            <span className={`mr-1.5 inline-block h-2 w-2 rounded-[2px] align-middle ${p.priority === "HIGH" ? "bg-bad" : p.priority === "MID" ? "bg-warn" : "bg-neutral"}`} />
                            {PRIORITY_LABEL[p.priority]}
                          </td>
                          <td className="td"><UserChip user={p.owner} /></td>
                          <td className="td tnum whitespace-nowrap">
                            {closed ? <span className="text-muted">{fmtDate(p.dueDate)}</span> : p.dueDate ? (
                              <span className={n !== null && n < 0 ? "text-bad" : ""}>
                                {fmtDate(p.dueDate)}
                                <div className={`text-[11px] ${n !== null && n < 0 ? "font-bold text-bad" : n !== null && n <= 3 ? "font-bold text-warn" : "text-muted"}`}>{dueLabel(p.dueDate)}</div>
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td className="td tnum text-right">{yen(p.amount)}</td>
                          <td className="td tnum text-right">{p._count.tasks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">対応履歴 <span className="ml-1 font-mono text-xs font-normal text-muted">{activities.length}</span></h2>
            </div>
            <div className="card-body">
              {activities.length === 0 ? (
                <Empty>まだ対応履歴がありません</Empty>
              ) : (
                <ol className="relative flex flex-col before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-0.5 before:bg-line">
                  {activities.map((a) => (
                    <li key={a.id} className="relative flex gap-3 py-2">
                      <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-surface-3 text-ink-2">
                        <Icon name={ACTIVITY_ICON[a.type]} size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span className="rounded-full border border-line px-2 text-[11px]">{ACTIVITY_LABEL[a.type]}</span>
                          <b className="text-ink">{a.user?.name}</b>
                          <span>{fmtDateTime(a.occurredAt)}</span>
                          {a.project ? <span className="text-primary">{a.project.name}</span> : null}
                        </div>
                        <p className="mt-0.5 break-words text-[13.5px]">{a.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-3 border-t border-dashed border-line pt-3 text-[12.5px] text-muted">対応履歴の記録はステージ5で追加します</p>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="card">
            <div className="card-head"><h2 className="text-[15px] font-bold">基本情報</h2></div>
            <div className="card-body">
              <dl className="dl">
                <dt>先方担当</dt>
                <dd>{c.contactName || "—"}{c.contactTitle ? <span className="ml-2 text-xs text-muted">{c.contactTitle}</span> : null}</dd>
                <dt>電話</dt>
                <dd className="tnum">{c.tel ? <a href={`tel:${c.tel}`} className="hover:underline">{c.tel}</a> : "—"}</dd>
                <dt>メール</dt>
                <dd>{c.email ? <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a> : "—"}</dd>
                <dt>住所</dt>
                <dd>{c.address || "—"}</dd>
                <dt>フリガナ</dt>
                <dd>{c.kana || "—"}</dd>
                <dt>登録日</dt>
                <dd>{fmtDate(c.createdAt)}</dd>
                <dt>更新日</dt>
                <dd>{fmtDateTime(c.updatedAt)}</dd>
              </dl>
              {c.note ? (
                <div className="mt-3 flex gap-2.5 rounded-[7px] bg-warn-soft px-3 py-2.5 text-[13px] text-warn">
                  <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <b>社内メモ</b>
                    <p className="whitespace-pre-wrap">{c.note}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">ファイル <span className="ml-1 font-mono text-xs font-normal text-muted">{files.length}</span></h2>
            </div>
            <div className="card-body">
              {files.length === 0 ? (
                <Empty>ファイルはありません</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {files.map((f) => {
                    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
                    return (
                      <li key={f.id} className="flex items-center gap-2.5 py-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold text-white" style={{ background: EXT_COLOR[ext] ?? "#66727f" }}>
                          {ext.slice(0, 4).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold" title={f.name}>{f.name}</div>
                          <div className="truncate text-xs text-muted">v{f.version} · {fileSize(f.size)} · {f.uploader?.name.split(" ")[0]} · {ago(f.createdAt)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="text-[15px] font-bold">変更履歴</h2></div>
            <div className="card-body">
              {logs.length === 0 ? (
                <Empty>変更履歴はありません</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {logs.map((l) => {
                    const changes = Array.isArray(l.changes) ? (l.changes as { field: string; from: string; to: string }[]) : [];
                    return (
                      <li key={l.id} className="flex gap-2.5 py-2">
                        {l.user ? <Avatar name={l.user.name} color={l.user.color} /> : null}
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px]"><b>{ACTION_LABEL[l.action] ?? l.action}</b><span className="ml-2 text-xs text-muted">{l.user?.name} · {fmtDateTime(l.createdAt)}</span></div>
                          {changes.length ? (
                            <ul className="mt-0.5 text-xs text-ink-2">
                              {changes.map((ch, i) => (
                                <li key={i}><span className="text-muted">{ch.field}</span>：<span className="text-bad line-through">{ch.from}</span> → <b className="text-good">{ch.to}</b></li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
