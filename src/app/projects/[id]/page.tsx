import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AuditList } from "@/components/audit-list";
import { FileList } from "@/components/file-list";
import { Icon } from "@/components/icons";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { StatusSelect } from "@/components/projects/status-select";
import { Avatar, UserChip } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { db } from "@/lib/db";
import { daysLeft, dueLabel, fmtDate, fmtDateTime, yen } from "@/lib/format";
import { NOTE_CATEGORY_LABEL, PRIORITY_LABEL, isClosed } from "@/lib/labels";
import { projectAlerts } from "@/lib/project-alerts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id }, select: { name: true } });
  return { title: p?.name ?? "案件" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: { select: { id: true, name: true, contactName: true, contactTitle: true, tel: true, email: true, note: true } },
      owner: { select: { name: true, color: true } },
      members: { include: { user: { select: { id: true, name: true, color: true } } } },
      tasks: { include: { assignee: { select: { name: true, color: true } } }, orderBy: [{ done: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }] },
      activities: { include: { user: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 50 },
      notes: { include: { author: { select: { name: true } } }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] },
      files: { include: { uploader: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!p) notFound();

  const logs = await db.auditLog.findMany({ where: { targetType: "project", targetId: id }, include: { user: { select: { name: true, color: true } } }, orderBy: { createdAt: "desc" }, take: 10 });

  const closed = isClosed(p.status);
  const openTasks = p.tasks.filter((t) => !t.done);
  const overdueTasks = openTasks.filter((t) => t.dueDate && daysLeft(t.dueDate) < 0).length;
  const alerts = projectAlerts({ status: p.status, dueDate: p.dueDate, overdueTasks, lastActivityAt: p.activities[0]?.occurredAt ?? null });
  const dueDays = p.dueDate ? daysLeft(p.dueDate) : null;

  return (
    <div>
      <Link href="/projects" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <span aria-hidden>←</span> 案件一覧
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted">{p.code}</div>
          <h1 className="mb-1.5 mt-0.5 text-[22px] font-bold">{p.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-ink-2">
            <StatusSelect id={p.id} status={p.status} />
            <span>
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-[2px] align-middle ${p.priority === "HIGH" ? "bg-bad" : p.priority === "MID" ? "bg-warn" : "bg-neutral"}`} />
              優先度 {PRIORITY_LABEL[p.priority]}
            </span>
            <Link href={`/customers/${p.customer.id}`} className="text-primary hover:underline">{p.customer.name}</Link>
            <span className="inline-flex items-center gap-1">担当：<UserChip user={p.owner} /></span>
            {p.members.length ? (
              <span className="inline-flex" title={p.members.map((m) => m.user.name).join("、")}>
                {p.members.map((m) => (
                  <span key={m.userId} className="-ml-1.5 rounded-full border-2 border-surface first:ml-0">
                    <Avatar name={m.user.name} color={m.user.color} size={24} />
                  </span>
                ))}
              </span>
            ) : null}
            {p.tags.length ? <span>{p.tags.map((t) => <Tag key={t}>{t}</Tag>)}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/projects/${p.id}/edit`} className="btn">編集</Link>
          <DeleteProjectButton id={p.id} name={p.name} />
        </div>
      </div>

      {alerts.length ? (
        <div className="mb-4 flex flex-col gap-1.5">
          {alerts.map((a) => (
            <div key={a.text} className={`flex items-center gap-2.5 rounded-[7px] px-3 py-2 text-[13px] ${a.level === "bad" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
              <Icon name="alert" size={16} className="shrink-0" />
              {a.text}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {p.summary ? (
            <section className="card">
              <div className="card-head"><h2 className="text-[15px] font-bold">概要</h2></div>
              <div className="card-body whitespace-pre-wrap text-[13.5px]">{p.summary}</div>
            </section>
          ) : null}

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">タスク <span className="ml-1 font-mono text-xs font-normal text-muted">{openTasks.length}/{p.tasks.length}</span></h2>
            </div>
            <div className="card-body">
              {p.tasks.length === 0 ? (
                <Empty>タスクはまだありません</Empty>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {p.tasks.map((t) => {
                    const n = t.dueDate ? daysLeft(t.dueDate) : null;
                    return (
                      <li key={t.id} className="flex items-center gap-2.5 rounded-[7px] border border-line px-3 py-2">
                        <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${t.done ? "border-good bg-good text-white" : "border-line-strong bg-surface"}`} aria-label={t.done ? "完了" : "未完了"}>
                          {t.done ? <Icon name="check" size={12} strokeWidth={2.4} /> : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className={`truncate font-bold ${t.done ? "text-muted line-through" : ""}`}>{t.title}</div>
                          <div className="text-xs text-muted">{t.assignee?.name ?? "未割当"}</div>
                        </div>
                        {t.assignee ? <Avatar name={t.assignee.name} color={t.assignee.color} /> : null}
                        <div className="tnum whitespace-nowrap text-right text-[13px] leading-tight">
                          {t.done ? <span className="text-muted">完了</span> : t.dueDate ? (
                            <>
                              <div className={n !== null && n < 0 ? "text-bad" : ""}>{fmtDate(t.dueDate)}</div>
                              <div className={`text-[11px] ${n !== null && n < 0 ? "font-bold text-bad" : n !== null && n <= 3 ? "font-bold text-warn" : "text-muted"}`}>{dueLabel(t.dueDate)}</div>
                            </>
                          ) : <span className="text-muted">期限なし</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 border-t border-dashed border-line pt-3 text-[12.5px] text-muted">タスクの追加・完了操作はステージ4で入れます</p>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">対応履歴 <span className="ml-1 font-mono text-xs font-normal text-muted">{p.activities.length}</span></h2>
            </div>
            <div className="card-body">
              <ActivityTimeline items={p.activities} />
              <p className="mt-3 border-t border-dashed border-line pt-3 text-[12.5px] text-muted">対応履歴の記録はステージ5で追加します</p>
            </div>
          </section>

          {p.notes.length ? (
            <section className="card">
              <div className="card-head"><h2 className="text-[15px] font-bold">社内メモ <span className="ml-1 font-mono text-xs font-normal text-muted">{p.notes.length}</span></h2></div>
              <div className="card-body flex flex-col gap-3">
                {p.notes.map((n) => (
                  <article key={n.id} className={`rounded-[7px] border border-line p-3 ${n.pinned ? "border-warn shadow-[inset_3px_0_0_var(--color-warn)]" : ""}`}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`badge ${n.category === "HANDOVER" ? "bg-warn-soft text-warn" : n.category === "RULE" ? "bg-info-soft text-info" : "bg-neutral-soft text-neutral"}`}>{NOTE_CATEGORY_LABEL[n.category]}</span>
                      <b className="text-[13.5px]">{n.title}</b>
                    </div>
                    <p className="whitespace-pre-wrap text-[13px] text-ink-2">{n.body}</p>
                    <div className="mt-2 text-xs text-muted">{n.author?.name} · {fmtDate(n.createdAt)}</div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <section className="card">
            <div className="card-head"><h2 className="text-[15px] font-bold">案件情報</h2></div>
            <div className="card-body">
              <dl className="dl">
                <dt>金額</dt>
                <dd className="tnum">{yen(p.amount)}</dd>
                <dt>開始日</dt>
                <dd className="tnum">{fmtDate(p.startDate)}</dd>
                <dt>納期</dt>
                <dd className="tnum">
                  {p.dueDate ? (
                    <>
                      <span className={!closed && dueDays !== null && dueDays < 0 ? "text-bad" : ""}>{fmtDate(p.dueDate)}</span>
                      {!closed ? <span className={`ml-2 text-xs ${dueDays !== null && dueDays < 0 ? "font-bold text-bad" : "text-muted"}`}>{dueLabel(p.dueDate)}</span> : null}
                    </>
                  ) : "—"}
                </dd>
                <dt>メンバー</dt>
                <dd>{[p.owner?.name, ...p.members.map((m) => m.user.name)].filter(Boolean).join("、") || "—"}</dd>
                <dt>先方窓口</dt>
                <dd>{p.customer.contactName || "—"}{p.customer.contactTitle ? <span className="ml-2 text-xs text-muted">{p.customer.contactTitle}</span> : null}</dd>
                <dt>電話</dt>
                <dd className="tnum">{p.customer.tel ? <a href={`tel:${p.customer.tel}`} className="hover:underline">{p.customer.tel}</a> : "—"}</dd>
                <dt>メール</dt>
                <dd>{p.customer.email ? <a href={`mailto:${p.customer.email}`} className="text-primary hover:underline">{p.customer.email}</a> : "—"}</dd>
                <dt>登録日</dt>
                <dd>{fmtDate(p.createdAt)}</dd>
                <dt>最終更新</dt>
                <dd>{fmtDateTime(p.updatedAt)}</dd>
              </dl>
              {p.customer.note ? (
                <div className="mt-3 flex gap-2.5 rounded-[7px] bg-warn-soft px-3 py-2.5 text-[13px] text-warn">
                  <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <b>お客さまメモ</b>
                    <p className="whitespace-pre-wrap">{p.customer.note}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="text-[15px] font-bold">ファイル <span className="ml-1 font-mono text-xs font-normal text-muted">{p.files.length}</span></h2></div>
            <div className="card-body"><FileList items={p.files} /></div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="text-[15px] font-bold">変更履歴</h2></div>
            <div className="card-body"><AuditList items={logs} /></div>
          </section>
        </div>
      </div>
    </div>
  );
}
