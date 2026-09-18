import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityQuickForm } from "@/components/activities/activity-quick-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AuditList } from "@/components/audit-list";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { FileList } from "@/components/file-list";
import { UploadButton } from "@/components/files/upload-dialog";
import { NoteCard } from "@/components/notes/note-card";
import { StatusLabel, Tag, TypeLabel } from "@/components/ui/badge";
import { activityOptions } from "@/lib/activity-options";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
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
  const me = await currentUser();
  const c = await db.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      owner: { select: { name: true } },
      projects: {
        where: { deletedAt: null },
        include: { owner: { select: { name: true } }, _count: { select: { tasks: { where: { done: false } } } } },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      },
      files: { where: { OR: [{ projectId: null }, { project: { deletedAt: null } }] }, include: { uploader: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();

  const [activities, logs, actOptions, notes] = await Promise.all([
    db.activity.findMany({
      where: { OR: [{ customerId: id }, { project: { customerId: id, deletedAt: null } }] },
      include: { user: { select: { name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
    db.auditLog.findMany({ where: { targetType: "customer", targetId: id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    activityOptions(),
    db.note.findMany({
      where: { OR: [{ customerId: id }, { project: { customerId: id, deletedAt: null } }] },
      include: { author: { select: { name: true } }, project: { select: { id: true, name: true } } },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  const projects = [...c.projects].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const projectFiles = await db.file.findMany({
    where: { project: { customerId: id, deletedAt: null }, customerId: { not: id } },
    include: { uploader: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const files = [...c.files, ...projectFiles].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const editable = can(me, "activity");
  const showAmount = can(me, "amount");

  return (
    <div>
      <p className="mb-1 text-[12px]">
        <Link href="/customers">« 顧客・取引先一覧へ戻る</Link>
      </p>
      <div className="ttl flex flex-wrap items-end justify-between gap-2">
        <h1>
          {c.name}
          <span className="sub">{c.code}</span>
        </h1>
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {can(me, "edit") ? <Link href={`/projects/new?customer=${c.id}`} className="btn">案件登録</Link> : null}
          {can(me, "edit") ? <Link href={`/customers/${c.id}/edit`} className="btn">編集</Link> : null}
          {can(me, "delete") ? <DeleteCustomerButton id={c.id} name={c.name} /> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className="box">
            <div className="box-head">基本情報</div>
            <table className="kv">
              <tbody>
                <tr>
                  <th className="w-[120px]">種別</th>
                  <td><TypeLabel type={c.type} /></td>
                  <th className="w-[120px]">業種</th>
                  <td>{c.industry || "－"}</td>
                </tr>
                <tr>
                  <th>フリガナ</th>
                  <td>{c.kana || "－"}</td>
                  <th>社内担当</th>
                  <td>{c.owner?.name ?? <span className="text-muted">未割当</span>}</td>
                </tr>
                <tr>
                  <th>先方担当者</th>
                  <td>
                    {c.contactName || "－"}
                    {c.contactTitle ? <span className="ml-1 text-[11px] text-muted">{c.contactTitle}</span> : null}
                  </td>
                  <th>電話番号</th>
                  <td className="tnum">{c.tel || "－"}</td>
                </tr>
                <tr>
                  <th>メールアドレス</th>
                  <td className="break-all">{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : "－"}</td>
                  <th>タグ</th>
                  <td>{c.tags.length ? c.tags.map((t) => <Tag key={t}>{t}</Tag>) : "－"}</td>
                </tr>
                <tr>
                  <th>住所</th>
                  <td colSpan={3}>{c.address || "－"}</td>
                </tr>
                <tr>
                  <th>登録日</th>
                  <td className="tnum">{fmtDate(c.createdAt)}</td>
                  <th>最終更新</th>
                  <td className="tnum">{fmtDateTime(c.updatedAt)}</td>
                </tr>
              </tbody>
            </table>
            {c.note ? (
              <div className="border-t border-line px-3 py-2">
                <div className="mb-0.5 text-[12px] font-bold">社内メモ</div>
                <p className="whitespace-pre-wrap text-[13px]">{c.note}</p>
              </div>
            ) : null}
          </div>

          <div className="box">
            <div className="box-head">案件（{projects.length}件）</div>
            {projects.length === 0 ? (
              <div className="box-body text-muted">案件はまだ登録されていません。</div>
            ) : (
              <div className="box-body overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="th">コード</th>
                      <th className="th">案件名</th>
                      <th className="th">ステータス</th>
                      <th className="th">優先度</th>
                      <th className="th">担当</th>
                      <th className="th">納期</th>
                      {showAmount ? <th className="th text-right">金額</th> : null}
                      <th className="th text-right">未完了タスク</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const closed = isClosed(p.status);
                      const n = p.dueDate ? daysLeft(p.dueDate) : null;
                      return (
                        <tr key={p.id} className="tr-link">
                          <td className="td tnum whitespace-nowrap">{p.code}</td>
                          <td className="td">
                            <Link href={`/projects/${p.id}`}>{p.name}</Link>
                          </td>
                          <td className="td whitespace-nowrap"><StatusLabel status={p.status} /></td>
                          <td className={`td text-center ${p.priority === "HIGH" ? "text-bad" : ""}`}>{PRIORITY_LABEL[p.priority]}</td>
                          <td className="td whitespace-nowrap">{p.owner?.name ?? <span className="text-muted">未割当</span>}</td>
                          <td className={`td tnum whitespace-nowrap ${!closed && n !== null && n < 0 ? "text-bad" : ""}`}>
                            {p.dueDate ? (
                              <>
                                {fmtDate(p.dueDate)}
                                {!closed ? <span className="ml-1 text-[11px]">（{dueLabel(p.dueDate)}）</span> : null}
                              </>
                            ) : (
                              <span className="text-muted">－</span>
                            )}
                          </td>
                          {showAmount ? <td className="td tnum text-right">{yen(p.amount)}</td> : null}
                          <td className="td tnum text-right">{p._count.tasks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="box">
            <div className="box-head">対応履歴（{activities.length}件）</div>
            <div className="box-body">
              <ActivityTimeline items={activities} showProject options={editable ? actOptions : undefined} />
              {editable ? <ActivityQuickForm customerId={c.id} /> : null}
            </div>
          </div>

          <div className="box">
            <div className="box-head">
              <span>社内メモ（{notes.length}件）</span>
              {editable ? (
                <span className="flex gap-1.5">
                  <Link href={`/notes/new?customer=${c.id}&category=HANDOVER`} className="btn btn-sm">引き継ぎメモ登録</Link>
                  <Link href={`/notes/new?customer=${c.id}`} className="btn btn-sm">メモ登録</Link>
                </span>
              ) : null}
            </div>
            <div className="box-body">
              {notes.length === 0 ? (
                <p className="text-muted">この顧客に紐づくメモはありません。</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {notes.map((n) => (
                    <NoteCard key={n.id} note={n} editable={editable} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="box">
            <div className="box-head">
              <span>ファイル（{files.length}）</span>
              {can(me, "file") ? <UploadButton options={actOptions} preset={{ customerId: c.id }} lockTarget label="追加" className="btn btn-sm" /> : null}
            </div>
            <div className="box-body">
              <FileList items={files} editable={can(me, "file")} />
            </div>
          </div>

          {can(me, "audit") ? (
            <div className="box">
              <div className="box-head">変更履歴</div>
              <div className="box-body">
                <AuditList items={logs} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
