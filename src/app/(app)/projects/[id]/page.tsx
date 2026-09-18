import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityQuickForm } from "@/components/activities/activity-quick-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AuditList } from "@/components/audit-list";
import { FileList } from "@/components/file-list";
import { UploadButton } from "@/components/files/upload-dialog";
import { NoteCard } from "@/components/notes/note-card";
import { HandoverButton } from "@/components/ai/handover-button";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { StatusSelect } from "@/components/projects/status-select";
import { AddTaskButton, TaskRow, TaskTableHead } from "@/components/tasks/task-row";
import { StatusLabel, Tag } from "@/components/ui/badge";
import { activityOptions } from "@/lib/activity-options";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { daysLeft, dueLabel, fmtDate, fmtDateTime, yen } from "@/lib/format";
import { PRIORITY_LABEL, isClosed } from "@/lib/labels";
import { projectAlerts } from "@/lib/project-alerts";
import { taskInclude, toTaskItem } from "@/lib/task-item";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id }, select: { name: true } });
  return { title: p?.name ?? "案件" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  const p = await db.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: { select: { id: true, name: true, contactName: true, contactTitle: true, tel: true, email: true, note: true } },
      owner: { select: { name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      tasks: { include: taskInclude, orderBy: [{ done: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] },
      activities: { include: { user: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 50 },
      notes: { include: { author: { select: { name: true } }, customer: { select: { id: true, name: true } } }, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }] },
      files: { include: { uploader: { select: { name: true } } }, orderBy: [{ name: "asc" }, { version: "desc" }] },
    },
  });
  if (!p) notFound();

  const [logs, users, projectOptions, actOptions] = await Promise.all([
    db.auditLog.findMany({ where: { targetType: "project", targetId: id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.project.findMany({ where: { deletedAt: null, status: { in: ["LEAD", "ACTIVE", "HOLD"] } }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
    activityOptions(),
  ]);
  const taskOptions = { users, projects: projectOptions.some((x) => x.id === p.id) ? projectOptions : [{ id: p.id, name: p.name }, ...projectOptions] };

  const closed = isClosed(p.status);
  const openTasks = p.tasks.filter((t) => !t.done);
  const overdueTasks = openTasks.filter((t) => t.dueDate && daysLeft(t.dueDate) < 0).length;
  const alerts = projectAlerts({ status: p.status, dueDate: p.dueDate, overdueTasks, lastActivityAt: p.activities[0]?.occurredAt ?? null });
  const dueDays = p.dueDate ? daysLeft(p.dueDate) : null;
  const editable = can(me, "activity");
  const tags = p.tags.length ? p.tags.map((t) => <Tag key={t}>{t}</Tag>) : <span className="text-muted">－</span>;

  return (
    <div>
      <p className="mb-1 text-[12px]">
        <Link href="/projects">« 案件一覧へ戻る</Link>
      </p>
      <div className="ttl flex flex-wrap items-end justify-between gap-2">
        <h1>
          {p.name}
          <span className="sub">{p.code}</span>
        </h1>
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {editable ? <HandoverButton projectId={p.id} /> : null}
          {can(me, "edit") ? <Link href={`/projects/${p.id}/edit`} className="btn">編集</Link> : null}
          {can(me, "delete") ? <DeleteProjectButton id={p.id} name={p.name} /> : null}
        </div>
      </div>

      {alerts.length ? (
        <div className="mb-3 flex flex-col gap-1">
          {alerts.map((a) => (
            <p key={a.text} className={a.level === "bad" ? "msg-bad" : "msg-warn"}>
              {a.text}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className="box">
            <div className="box-head">基本情報</div>
            <table className="kv">
              <tbody>
                <tr>
                  <th className="w-[130px]">顧客・取引先</th>
                  <td>
                    <Link href={`/customers/${p.customer.id}`}>{p.customer.name}</Link>
                  </td>
                  <th className="w-[110px]">ステータス</th>
                  <td>{can(me, "edit") ? <StatusSelect id={p.id} status={p.status} /> : <StatusLabel status={p.status} />}</td>
                </tr>
                <tr>
                  <th>担当</th>
                  <td>{p.owner?.name ?? <span className="text-muted">未割当</span>}</td>
                  <th>優先度</th>
                  <td className={p.priority === "HIGH" ? "text-bad" : ""}>{PRIORITY_LABEL[p.priority]}</td>
                </tr>
                <tr>
                  <th>メンバー</th>
                  <td colSpan={3}>
                    {p.members.length ? p.members.map((m) => m.user.name).join("、") : <span className="text-muted">－</span>}
                  </td>
                </tr>
                <tr>
                  <th>開始日</th>
                  <td className="tnum">{fmtDate(p.startDate) || "－"}</td>
                  <th>納期</th>
                  <td className="tnum">
                    {p.dueDate ? (
                      <>
                        <span className={!closed && dueDays !== null && dueDays < 0 ? "text-bad" : ""}>{fmtDate(p.dueDate)}</span>
                        {!closed ? <span className={`ml-1 text-[11px] ${dueDays !== null && dueDays < 0 ? "text-bad" : "text-muted"}`}>（{dueLabel(p.dueDate)}）</span> : null}
                      </>
                    ) : (
                      "－"
                    )}
                  </td>
                </tr>
                <tr>
                  {can(me, "amount") ? (
                    <>
                      <th>金額</th>
                      <td className="tnum">{yen(p.amount)}</td>
                      <th>タグ</th>
                      <td>{tags}</td>
                    </>
                  ) : (
                    <>
                      <th>タグ</th>
                      <td colSpan={3}>{tags}</td>
                    </>
                  )}
                </tr>
                <tr>
                  <th>登録日</th>
                  <td className="tnum">{fmtDate(p.createdAt)}</td>
                  <th>最終更新</th>
                  <td className="tnum">{fmtDateTime(p.updatedAt)}</td>
                </tr>
              </tbody>
            </table>
            {p.summary ? (
              <div className="border-t border-line px-3 py-2">
                <div className="mb-0.5 text-[12px] font-bold">概要</div>
                <div className="whitespace-pre-wrap text-[13px]">{p.summary}</div>
              </div>
            ) : null}
          </div>

          <div className="box">
            <div className="box-head">
              <span>
                タスク（未完了 {openTasks.length} / 全 {p.tasks.length}）
              </span>
              {editable ? <AddTaskButton options={taskOptions} preset={{ projectId: p.id, assigneeId: p.ownerId ?? "" }} className="btn btn-sm" /> : null}
            </div>
            <div className="box-body">
              {p.tasks.length === 0 ? (
                <p className="text-muted">タスクはまだ登録されていません。</p>
              ) : (
                <table className="tbl">
                  <TaskTableHead showProject={false} actions={editable} />
                  <tbody>
                    {p.tasks.map((t) => (
                      <TaskRow key={t.id} task={toTaskItem(t)} options={editable ? taskOptions : undefined} readOnly={!editable} showProject={false} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="box">
            <div className="box-head">対応履歴（{p.activities.length}件）</div>
            <div className="box-body">
              <ActivityTimeline items={p.activities} options={editable ? actOptions : undefined} />
              {editable ? <ActivityQuickForm projectId={p.id} /> : null}
            </div>
          </div>

          <div className="box">
            <div className="box-head">
              <span>社内メモ（{p.notes.length}件）</span>
              {editable ? (
                <span className="flex gap-1.5">
                  <Link href={`/notes/new?project=${p.id}&category=HANDOVER`} className="btn btn-sm">引き継ぎメモ登録</Link>
                  <Link href={`/notes/new?project=${p.id}`} className="btn btn-sm">メモ登録</Link>
                </span>
              ) : null}
            </div>
            <div className="box-body">
              {p.notes.length === 0 ? (
                <p className="text-muted">この案件に紐づくメモはありません。</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {p.notes.map((n) => (
                    <NoteCard key={n.id} note={n} showLinks={false} editable={editable} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="box">
            <div className="box-head">先方窓口</div>
            <table className="kv">
              <tbody>
                <tr>
                  <th className="w-[80px]">担当者</th>
                  <td>
                    {p.customer.contactName || "－"}
                    {p.customer.contactTitle ? <span className="ml-1 text-[11px] text-muted">{p.customer.contactTitle}</span> : null}
                  </td>
                </tr>
                <tr>
                  <th>電話</th>
                  <td className="tnum">{p.customer.tel || "－"}</td>
                </tr>
                <tr>
                  <th>メール</th>
                  <td className="break-all">{p.customer.email ? <a href={`mailto:${p.customer.email}`}>{p.customer.email}</a> : "－"}</td>
                </tr>
              </tbody>
            </table>
            {p.customer.note ? (
              <div className="border-t border-line px-3 py-2 text-[12.5px]">
                <div className="font-bold">顧客の注意点</div>
                <p className="whitespace-pre-wrap">{p.customer.note}</p>
              </div>
            ) : null}
          </div>

          <div className="box">
            <div className="box-head">
              <span>ファイル（{p.files.length}）</span>
              {can(me, "file") ? <UploadButton options={actOptions} preset={{ projectId: p.id }} lockTarget label="追加" className="btn btn-sm" /> : null}
            </div>
            <div className="box-body">
              <FileList items={p.files} editable={can(me, "file")} />
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
