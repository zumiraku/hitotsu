import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityQuickForm } from "@/components/activities/activity-quick-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AuditList } from "@/components/audit-list";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { FileList } from "@/components/file-list";
import { UploadButton } from "@/components/files/upload-dialog";
import { Icon } from "@/components/icons";
import { NoteCard } from "@/components/notes/note-card";
import { UserChip } from "@/components/ui/avatar";
import { CustomerTypeBadge, StatusBadge, Tag } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { activityOptions } from "@/lib/activity-options";
import { db } from "@/lib/db";
import { daysLeft, dueLabel, fmtDate, fmtDateTime, yen } from "@/lib/format";
import { PRIORITY_LABEL, STATUS_ORDER, isClosed } from "@/lib/labels";

export const dynamic = "force-dynamic";

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

  const [activities, logs, actOptions, notes] = await Promise.all([
    db.activity.findMany({
      where: { OR: [{ customerId: id }, { project: { customerId: id } }] },
      include: { user: { select: { name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
    db.auditLog.findMany({ where: { targetType: "customer", targetId: id }, include: { user: { select: { name: true, color: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    activityOptions(),
    db.note.findMany({
      where: { OR: [{ customerId: id }, { project: { customerId: id, deletedAt: null } }] },
      include: { author: { select: { name: true, color: true } }, project: { select: { id: true, name: true } } },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
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
          <Link href={`/projects/new?customer=${c.id}`} className="btn">＋ 案件を追加</Link>
          <Link href={`/customers/${c.id}/edit`} className="btn">編集</Link>
          <DeleteCustomerButton id={c.id} name={c.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                            <Link href={`/projects/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
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
              <ActivityTimeline items={activities} showProject options={actOptions} />
              <ActivityQuickForm customerId={c.id} />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">社内メモ <span className="ml-1 font-mono text-xs font-normal text-muted">{notes.length}</span></h2>
              <span className="flex gap-1.5">
                <Link href={`/notes/new?customer=${c.id}&category=HANDOVER`} className="btn h-7 px-2.5 text-[12.5px]">引き継ぎを書く</Link>
                <Link href={`/notes/new?customer=${c.id}`} className="btn h-7 px-2.5 text-[12.5px]">＋ メモ</Link>
              </span>
            </div>
            <div className="card-body">
              {notes.length === 0 ? (
                <Empty>この顧客に紐づくメモはまだありません</Empty>
              ) : (
                <div className="flex flex-col gap-3">
                  {notes.map((n) => (
                    <NoteCard key={n.id} note={n} />
                  ))}
                </div>
              )}
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
              <UploadButton options={actOptions} preset={{ customerId: c.id }} lockTarget label="＋ 追加" className="btn h-7 px-2.5 text-[12.5px]" />
            </div>
            <div className="card-body">
              <FileList items={files} editable />
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="text-[15px] font-bold">変更履歴</h2></div>
            <div className="card-body">
              <AuditList items={logs} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
