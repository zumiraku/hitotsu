import Link from "next/link";
import { AddActivityButton } from "@/components/activities/activity-item-menu";
import { TaskRow, TaskTableHead } from "@/components/tasks/task-row";
import { StatusLabel } from "@/components/ui/badge";
import { activityOptions } from "@/lib/activity-options";
import { dailySummary } from "@/lib/ai/summary";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { WEEKDAY, daysLeft, endOfWeek, fmtDate, fmtDateTime, startOfToday } from "@/lib/format";
import { ACTIVITY_LABEL, NOTE_CATEGORY_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { projectAlerts } from "@/lib/project-alerts";
import { liveProject, liveRefs } from "@/lib/scope";
import { taskInclude, toTaskItem } from "@/lib/task-item";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await currentUser();
  const today = startOfToday();
  const weekEnd = endOfWeek();
  const utc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

  const [projects, openTasks, customerCount, recentActivities, statusCounts, users, actOptions, pinnedNotes, summary] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null, status: { in: ["ACTIVE", "HOLD", "LEAD"] } },
      include: {
        customer: { select: { name: true } },
        owner: { select: { name: true } },
        tasks: { where: { done: false, dueDate: { lt: utc(today) } }, select: { id: true } },
        activities: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.task.findMany({ where: { done: false, ...liveProject }, include: taskInclude, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] }),
    db.customer.count({ where: { deletedAt: null } }),
    db.activity.findMany({
      where: liveRefs,
      take: 8,
      orderBy: { occurredAt: "desc" },
      include: { user: { select: { name: true } }, project: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } },
    }),
    db.project.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    activityOptions(),
    db.note.findMany({ where: { pinned: true, ...liveRefs }, include: { author: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 6 }),
    dailySummary(me.id),
  ]);

  const active = projects.filter((p) => p.status === "ACTIVE");
  const withDue = openTasks.filter((t) => t.dueDate);
  const overdue = withDue.filter((t) => daysLeft(t.dueDate!) < 0);
  const thisWeek = withDue.filter((t) => daysLeft(t.dueDate!) >= 0 && t.dueDate! <= utc(weekEnd));
  const mine = openTasks.filter((t) => t.assigneeId === me.id);
  const mineOverdue = mine.filter((t) => t.dueDate && daysLeft(t.dueDate) < 0).length;
  const focus = withDue.filter((t) => daysLeft(t.dueDate!) <= 3);

  const attention = projects
    .map((p) => ({ p, reasons: projectAlerts({ status: p.status, dueDate: p.dueDate, overdueTasks: p.tasks.length, lastActivityAt: p.activities[0]?.occurredAt ?? null }) }))
    .filter((x) => x.reasons.length)
    .sort((a, b) => Number(b.reasons.some((r) => r.level === "bad")) - Number(a.reasons.some((r) => r.level === "bad")));

  const total = statusCounts.reduce((s, c) => s + c._count._all, 0);
  const countOf = (s: (typeof STATUS_ORDER)[number]) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;

  const load = users
    .map((u) => {
      const ts = openTasks.filter((t) => t.assigneeId === u.id);
      return { u, open: ts.length, overdue: ts.filter((t) => t.dueDate && daysLeft(t.dueDate) < 0).length };
    })
    .filter((x) => x.open > 0)
    .sort((a, b) => b.open - a.open);

  const now = new Date();
  const summaryRows: [string, number, string][] = [
    ["進行中の案件", active.length, "/projects?status=ACTIVE"],
    ["要確認の案件", attention.length, "/projects?status=open"],
    ["期限超過のタスク", overdue.length, "/tasks?show=overdue"],
    ["今週が期限のタスク", thisWeek.length, "/tasks?show=week"],
    ["自分の未完了タスク", mine.length, "/tasks?show=mine"],
  ];

  return (
    <div>
      <div className="ttl flex flex-wrap items-end justify-between gap-2">
        <h1>
          ホーム
          <span className="sub">
            {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日（{WEEKDAY[now.getDay()]}）
          </span>
        </h1>
        <div className="flex gap-1.5 pb-0.5">
          {can(me, "edit") ? <Link href="/projects/new" className="btn">案件登録</Link> : null}
          {can(me, "activity") ? <AddActivityButton options={actOptions} /> : null}
        </div>
      </div>

      <div className="box mb-4">
        <div className="box-head">本日の状況</div>
        <div className="box-body text-[13px]">{summary}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <div className="box">
            <div className="box-head">
              <span>期限が近いタスク（3日以内・期限超過）　{focus.length}件</span>
              <Link href="/tasks" className="text-[12px] font-normal">タスク一覧へ</Link>
            </div>
            <div className="box-body">
              {focus.length === 0 ? (
                <p className="text-muted">3日以内に期限を迎えるタスクはありません。</p>
              ) : (
                <table className="tbl">
                  <TaskTableHead />
                  <tbody>
                    {focus.slice(0, 10).map((t) => (
                      <TaskRow key={t.id} task={toTaskItem(t)} readOnly={!can(me, "activity")} />
                    ))}
                  </tbody>
                </table>
              )}
              {focus.length > 10 ? (
                <p className="mt-1 text-right text-[12px]">
                  <Link href="/tasks">残り{focus.length - 10}件を表示</Link>
                </p>
              ) : null}
            </div>
          </div>

          <div className="box">
            <div className="box-head">
              <span>要確認の案件　{attention.length}件</span>
              <Link href="/projects?status=open" className="text-[12px] font-normal">案件一覧へ</Link>
            </div>
            <div className="box-body">
              {attention.length === 0 ? (
                <p className="text-muted">要確認の案件はありません。</p>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="th">案件名</th>
                      <th className="th">顧客</th>
                      <th className="th">担当</th>
                      <th className="th">ステータス</th>
                      <th className="th">確認事項</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attention.map(({ p, reasons }) => (
                      <tr key={p.id} className="tr-link">
                        <td className="td">
                          <Link href={`/projects/${p.id}`}>{p.name}</Link>
                        </td>
                        <td className="td">{p.customer.name}</td>
                        <td className="td whitespace-nowrap">{p.owner?.name ?? "未割当"}</td>
                        <td className="td whitespace-nowrap"><StatusLabel status={p.status} /></td>
                        <td className="td">
                          {reasons.map((r, i) => (
                            <span key={r.text} className={r.level === "bad" ? "text-bad" : "text-warn"}>
                              {i > 0 ? "、" : ""}
                              {r.text}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="box">
            <div className="box-head">最近の対応履歴</div>
            <div className="box-body">
              {recentActivities.length === 0 ? (
                <p className="text-muted">対応履歴はまだありません。</p>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="th">日時</th>
                      <th className="th">種別</th>
                      <th className="th">担当</th>
                      <th className="th">案件・顧客</th>
                      <th className="th">内容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities.map((a) => (
                      <tr key={a.id}>
                        <td className="td tnum whitespace-nowrap">{fmtDateTime(a.occurredAt)}</td>
                        <td className="td whitespace-nowrap">{ACTIVITY_LABEL[a.type]}</td>
                        <td className="td whitespace-nowrap">{a.user?.name}</td>
                        <td className="td">
                          {a.project ? <Link href={`/projects/${a.project.id}`}>{a.project.name}</Link> : a.customer ? <Link href={`/customers/${a.customer.id}`}>{a.customer.name}</Link> : null}
                        </td>
                        <td className="td">
                          <span className="line-clamp-2">{a.body}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="box">
            <div className="box-head">集計</div>
            <div className="box-body">
              <table className="tbl">
                <tbody>
                  {summaryRows.map(([label, n, href]) => (
                    <tr key={label}>
                      <th className="th font-normal">{label}</th>
                      <td className="td tnum w-24 text-right">
                        <Link href={href}>{n}</Link> 件
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th className="th font-normal">顧客・取引先</th>
                    <td className="td tnum text-right">
                      <Link href="/customers">{customerCount}</Link> 社
                    </td>
                  </tr>
                </tbody>
              </table>
              {mineOverdue ? <p className="mt-2 text-[12px] text-bad">自分の担当で期限超過のタスクが {mineOverdue} 件あります。</p> : null}
            </div>
          </div>

          <div className="box">
            <div className="box-head">案件ステータス別件数</div>
            <div className="box-body">
              <table className="tbl">
                <tbody>
                  {STATUS_ORDER.map((s) => (
                    <tr key={s}>
                      <th className="th font-normal">{STATUS_LABEL[s]}</th>
                      <td className="td tnum w-24 text-right">
                        <Link href={`/projects?status=${s}`}>{countOf(s)}</Link> 件
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th className="th">合計</th>
                    <td className="td tnum text-right font-bold">{total} 件</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="box">
            <div className="box-head">担当者別の未完了タスク</div>
            <div className="box-body">
              {load.length === 0 ? (
                <p className="text-muted">未完了のタスクはありません。</p>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="th">担当者</th>
                      <th className="th text-right">未完了</th>
                      <th className="th text-right">期限超過</th>
                    </tr>
                  </thead>
                  <tbody>
                    {load.map(({ u, open, overdue: od }) => (
                      <tr key={u.id}>
                        <td className="td">
                          <Link href={`/tasks?assignee=${u.id}`}>{u.name}</Link>
                        </td>
                        <td className="td tnum text-right">{open}</td>
                        <td className={`td tnum text-right ${od ? "text-bad" : ""}`}>{od}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {pinnedNotes.length ? (
            <div className="box">
              <div className="box-head">
                <span>ピン留めメモ</span>
                <Link href="/notes?pinned=1" className="text-[12px] font-normal">メモ一覧へ</Link>
              </div>
              <div className="box-body">
                <ul className="text-[13px]">
                  {pinnedNotes.map((n) => (
                    <li key={n.id} className="border-b border-line-2 py-1 last:border-b-0">
                      <span className="lbl mr-1.5">{NOTE_CATEGORY_LABEL[n.category]}</span>
                      <Link href={`/notes#note-${n.id}`}>{n.title}</Link>
                      <span className="ml-2 text-[11px] text-muted">
                        {n.author?.name}　{fmtDate(n.updatedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
