import Link from "next/link";
import { AddActivityButton } from "@/components/activities/activity-item-menu";
import { Icon } from "@/components/icons";
import { CategoryBadge } from "@/components/notes/note-card";
import { TaskRow } from "@/components/tasks/task-row";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { activityOptions } from "@/lib/activity-options";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { WEEKDAY, daysLeft, endOfWeek, fmtDate, fmtDateTime, startOfToday, toInputDate } from "@/lib/format";
import { ACTIVITY_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { projectAlerts } from "@/lib/project-alerts";
import { taskInclude, toTaskItem } from "@/lib/task-item";

export const dynamic = "force-dynamic";

function Kpi({ label, value, hint, tone, href }: { label: string; value: number; hint: string; tone: "info" | "bad" | "warn" | "good" | "plain"; href: string }) {
  const toneText = { info: "text-info", bad: "text-bad", warn: "text-warn", good: "text-good", plain: "" }[tone];
  const toneBar = { info: "bg-info", bad: "bg-bad", warn: "bg-warn", good: "bg-good", plain: "bg-line" }[tone];
  return (
    <Link href={href} className="card relative overflow-hidden px-3.5 py-3 hover:border-line-strong">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${toneBar}`} />
      <div className="text-xs text-muted">{label}</div>
      <div className={`tnum font-display text-[28px] font-bold leading-tight ${toneText}`}>
        {value}
        <span className="ml-0.5 font-sans text-[13px] font-medium text-muted">件</span>
      </div>
      <div className="text-xs text-muted">{hint}</div>
    </Link>
  );
}

export default async function DashboardPage() {
  const me = await currentUser();
  const today = startOfToday();
  const weekEnd = endOfWeek();
  const utc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const liveTask = { OR: [{ projectId: null }, { project: { deletedAt: null } }] };

  const [projects, openTasks, customerCount, recentActivities, statusCounts, monthActivities, users, actOptions, pinnedNotes] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null, status: { in: ["ACTIVE", "HOLD", "LEAD"] } },
      include: {
        customer: { select: { name: true } },
        owner: { select: { name: true, color: true } },
        tasks: { where: { done: false, dueDate: { lt: utc(today) } }, select: { id: true } },
        activities: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.task.findMany({ where: { done: false, ...liveTask }, include: taskInclude, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] }),
    db.customer.count({ where: { deletedAt: null } }),
    db.activity.findMany({
      take: 7,
      orderBy: { occurredAt: "desc" },
      include: { user: { select: { name: true, color: true } }, project: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } },
    }),
    db.project.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    db.activity.count({ where: { occurredAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    activityOptions(),
    db.note.findMany({ where: { pinned: true }, include: { author: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 6 }),
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

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return { d, n: withDue.filter((t) => daysLeft(t.dueDate!) === i).length };
  });

  const load = users
    .map((u) => {
      const ts = openTasks.filter((t) => t.assigneeId === u.id);
      return { u, open: ts.length, overdue: ts.filter((t) => t.dueDate && daysLeft(t.dueDate) < 0).length };
    })
    .filter((x) => x.open > 0)
    .sort((a, b) => b.open - a.open);
  const maxLoad = Math.max(1, ...load.map((x) => x.open));

  const now = new Date();
  const greet = now.getHours() < 11 ? "おはようございます" : now.getHours() < 18 ? "こんにちは" : "お疲れさまです";

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{greet}、{me.name.split(" ")[0]}さん</h1>
          <div className="text-[13px] text-muted">
            {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日（{WEEKDAY[now.getDay()]}）　顧客・取引先 {customerCount}社
          </div>
        </div>
        <div className="flex gap-2">
          {can(me, "edit") ? <Link href="/projects/new" className="btn btn-primary">＋ 案件を追加</Link> : null}
          {can(me, "activity") ? <AddActivityButton options={actOptions} /> : null}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="進行中の案件" value={active.length} hint={`全${total}件中`} tone="info" href="/projects?status=ACTIVE" />
        <Kpi label="期限超過のタスク" value={overdue.length} hint={overdue.length ? "要対応" : "すべて期限内"} tone={overdue.length ? "bad" : "good"} href="/tasks?show=overdue" />
        <Kpi label="今週が期限のタスク" value={thisWeek.length} hint={`${fmtDate(weekEnd).slice(5)}まで`} tone="warn" href="/tasks?show=week" />
        <Kpi label="要確認の案件" value={attention.length} hint="超過・放置・保留" tone={attention.length ? "warn" : "good"} href="/projects?status=open" />
        <Kpi label="自分の未完了タスク" value={mine.length} hint={mineOverdue ? `うち超過 ${mineOverdue}件` : "超過なし"} tone={mineOverdue ? "bad" : "plain"} href="/tasks?show=mine" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">3日以内の期限・超過 <span className="ml-1 font-mono text-xs font-normal text-muted">{focus.length}</span></h2>
              <Link href="/tasks" className="text-xs text-primary">すべて見る</Link>
            </div>
            <div className="card-body flex flex-col gap-1.5">
              {focus.length === 0 ? <p className="py-4 text-center text-[13px] text-muted">3日以内に期限を迎えるタスクはありません</p> : focus.slice(0, 8).map((t) => <TaskRow key={t.id} task={toTaskItem(t)} readOnly={!can(me, "activity")} />)}
              {focus.length > 8 ? <Link href="/tasks" className="mt-1 text-center text-xs text-primary">残り{focus.length - 8}件を見る</Link> : null}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">要確認の案件 <span className="ml-1 font-mono text-xs font-normal text-muted">{attention.length}</span></h2>
              <Link href="/projects?status=open" className="text-xs text-primary">すべて見る</Link>
            </div>
            <div className="card-body">
              {attention.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-muted">要確認の案件はありません</p>
              ) : (
                <ul className="divide-y divide-line">
                  {attention.map(({ p, reasons }) => (
                    <li key={p.id} className="flex items-center gap-2.5 py-2.5">
                      {p.owner ? <Avatar name={p.owner.name} color={p.owner.color} /> : null}
                      <div className="min-w-0 flex-1">
                        <Link href={`/projects/${p.id}`} className="block truncate font-bold hover:underline">{p.name}</Link>
                        <div className="truncate text-xs text-muted">
                          {p.customer.name} ·{" "}
                          {reasons.map((r, i) => (
                            <span key={r.text} className={r.level === "bad" ? "text-bad" : "text-warn"}>
                              {i > 0 ? " / " : ""}{r.text}
                            </span>
                          ))}
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="card">
            <div className="card-head"><h2 className="text-[15px] font-bold">案件ステータス</h2></div>
            <div className="card-body">
              <div className="my-1.5 flex h-3 overflow-hidden rounded-full bg-surface-3">
                {STATUS_ORDER.filter((s) => countOf(s) > 0).map((s) => (
                  <Link key={s} href={`/projects?status=${s}`} style={{ width: `${(countOf(s) / Math.max(total, 1)) * 100}%`, background: STATUS_COLOR[s] }} title={`${STATUS_LABEL[s]} ${countOf(s)}件`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-ink-2">
                {STATUS_ORDER.map((s) => (
                  <Link key={s} href={`/projects?status=${s}`} className="hover:underline">
                    <i className="mr-1.5 inline-block h-[9px] w-[9px] rounded-[2px] align-middle" style={{ background: STATUS_COLOR[s] }} />
                    {STATUS_LABEL[s]} <b className="tnum">{countOf(s)}</b>
                  </Link>
                ))}
              </div>

              <h3 className="mt-4 text-[13.5px] font-bold">今後14日の期限</h3>
              <div className="mt-2 grid grid-cols-14 gap-1">
                {days.map(({ d }) => (
                  <div key={"w" + d.getTime()} className="text-center text-[10px] text-muted">{WEEKDAY[d.getDay()]}</div>
                ))}
                {days.map(({ d, n }, i) => (
                  <Link
                    key={d.getTime()}
                    href={`/tasks?due=${toInputDate(utc(d))}`}
                    title={`${fmtDate(utc(d))}：期限のタスク ${n}件`}
                    className={`tnum flex aspect-square items-center justify-center rounded text-[11px] hover:ring-2 hover:ring-primary ${
                      n >= 3 ? "bg-info font-bold text-white" : n > 0 ? "bg-info-soft font-bold text-info" : "bg-surface-3 text-muted"
                    } ${i === 0 ? "outline outline-2 -outline-offset-2 outline-primary" : ""} ${d.getDay() === 0 || d.getDay() === 6 ? "opacity-60" : ""}`}
                  >
                    {d.getDate()}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="text-[15px] font-bold">担当者別の未完了タスク</h2></div>
            <div className="card-body flex flex-col gap-2">
              {load.length === 0 ? <p className="py-2 text-center text-[13px] text-muted">未完了のタスクはありません</p> : null}
              {load.map(({ u, open, overdue: od }) => (
                <Link key={u.id} href={`/tasks?assignee=${u.id}`} className="flex items-center gap-2.5 text-[13px] hover:underline">
                  <Avatar name={u.name} color={u.color} size={22} />
                  <span className="w-24 shrink-0 truncate">{u.name}</span>
                  <span className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <span className="bg-bad" style={{ width: `${(od / maxLoad) * 100}%` }} />
                    <span className="bg-info" style={{ width: `${((open - od) / maxLoad) * 100}%` }} />
                  </span>
                  <span className="tnum w-20 shrink-0 text-right text-xs text-muted">
                    <b className="text-ink">{open}</b>件{od ? <span className="text-bad">（超過{od}）</span> : null}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">最近の対応履歴</h2>
              <span className="text-xs text-muted">今月 {monthActivities}件</span>
            </div>
            <div className="card-body">
              <ul className="divide-y divide-line">
                {recentActivities.map((a) => (
                  <li key={a.id} className="flex gap-2.5 py-2.5">
                    {a.user ? <Avatar name={a.user.name} color={a.user.color} /> : null}
                    <div className="min-w-0 flex-1 text-[13px]">
                      <div className="flex flex-wrap gap-1.5 text-xs text-muted">
                        <b className="text-ink">{a.user?.name.split(" ")[0]}</b>
                        <span className="rounded-full border border-line px-2 text-[11px]">{ACTIVITY_LABEL[a.type]}</span>
                        <span>{fmtDateTime(a.occurredAt)}</span>
                      </div>
                      <div className="mt-0.5 line-clamp-2">
                        {a.project ? <Link href={`/projects/${a.project.id}`} className="text-primary hover:underline">{a.project.name}</Link> : a.customer ? <Link href={`/customers/${a.customer.id}`} className="text-primary hover:underline">{a.customer.name}</Link> : null}
                        {a.project || a.customer ? "　" : ""}
                        {a.body}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {pinnedNotes.length ? (
            <section className="card">
              <div className="card-head">
                <h2 className="text-[15px] font-bold">ピン留めメモ</h2>
                <Link href="/notes?pinned=1" className="text-xs text-primary">すべて見る</Link>
              </div>
              <div className="card-body">
                <ul className="divide-y divide-line">
                  {pinnedNotes.map((n) => (
                    <li key={n.id} className="py-2">
                      <Link href={`/notes#note-${n.id}`} className="flex items-start gap-2 hover:underline">
                        <CategoryBadge category={n.category} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-bold">{n.title}</span>
                          <span className="block truncate text-xs text-muted">{n.author?.name.split(" ")[0]} · {n.body.split("\n")[0]}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <div className="flex items-start gap-2.5 rounded-[7px] bg-violet-soft px-3 py-2.5 text-[13px] text-violet">
            <Icon name="spark" size={16} className="mt-0.5 shrink-0" />
            <div><b>AIアシスト</b>はステージ9で有効化します。引き継ぎメモの下書きや自然言語での検索を、効果の見えた箇所から入れていきます。</div>
          </div>
        </div>
      </div>
    </div>
  );
}
