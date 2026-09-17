import Link from "next/link";
import { Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { ACTIVITY_LABEL, STATUS_CLASS, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { WEEKDAY, ago, daysAgo, daysLeft, daysSince, dueLabel, endOfWeek, fmtDate, fmtDateTime, startOfToday } from "@/lib/format";

export const dynamic = "force-dynamic";

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span className="avatar" style={{ background: color }} title={name}>
      {name.slice(0, 1)}
    </span>
  );
}

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
  const today = startOfToday();
  const weekEnd = endOfWeek();
  const staleBefore = daysAgo(14);

  const [projects, openTasks, customerCount, recentActivities, statusCounts, monthActivities] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null, status: { in: ["ACTIVE", "HOLD", "LEAD"] } },
      include: {
        customer: { select: { name: true } },
        owner: { select: { name: true, color: true } },
        tasks: { where: { done: false, dueDate: { lt: today } }, select: { id: true } },
        activities: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.task.findMany({
      where: { done: false, dueDate: { not: null } },
      include: { project: { select: { id: true, name: true } }, assignee: { select: { name: true, color: true } } },
      orderBy: { dueDate: "asc" },
    }),
    db.customer.count({ where: { deletedAt: null } }),
    db.activity.findMany({
      take: 7,
      orderBy: { occurredAt: "desc" },
      include: { user: { select: { name: true, color: true } }, project: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } },
    }),
    db.project.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    db.activity.count({ where: { occurredAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } } }),
  ]);

  const active = projects.filter((p) => p.status === "ACTIVE");
  const overdue = openTasks.filter((t) => t.dueDate && daysLeft(t.dueDate) < 0);
  const thisWeek = openTasks.filter((t) => t.dueDate && daysLeft(t.dueDate) >= 0 && t.dueDate <= weekEnd);

  const attention = projects
    .map((p) => {
      const reasons: { level: "bad" | "warn"; text: string }[] = [];
      if (p.tasks.length) reasons.push({ level: "bad", text: `期限超過のタスク ${p.tasks.length}件` });
      if (p.dueDate && daysLeft(p.dueDate) < 0) reasons.push({ level: "bad", text: `納期を${-daysLeft(p.dueDate)}日超過` });
      const last = p.activities[0]?.occurredAt;
      if (p.status === "ACTIVE" && (!last || last < staleBefore)) {
        reasons.push({ level: "warn", text: last ? `最終対応から${daysSince(last)}日経過` : "対応履歴なし" });
      }
      if (p.status === "HOLD") reasons.push({ level: "warn", text: "保留中：再開時期を確認" });
      return { p, reasons };
    })
    .filter((x) => x.reasons.length);

  const total = statusCounts.reduce((s, c) => s + c._count._all, 0);
  const countOf = (s: (typeof STATUS_ORDER)[number]) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const n = openTasks.filter((t) => t.dueDate && daysLeft(t.dueDate) === i).length;
    return { d, n };
  });

  const now = new Date();
  const greet = now.getHours() < 11 ? "おはようございます" : now.getHours() < 18 ? "こんにちは" : "お疲れさまです";

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{greet}</h1>
          <div className="text-[13px] text-muted">
            {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日（{WEEKDAY[now.getDay()]}）　顧客・取引先 {customerCount}社
          </div>
        </div>
        <Link href="/plan" className="btn">開発計画を見る</Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="進行中の案件" value={active.length} hint={`全${total}件中`} tone="info" href="/projects" />
        <Kpi label="期限超過のタスク" value={overdue.length} hint={overdue.length ? "要対応" : "すべて期限内"} tone={overdue.length ? "bad" : "good"} href="/tasks" />
        <Kpi label="今週が期限のタスク" value={thisWeek.length} hint={`${fmtDate(weekEnd).slice(5)}まで`} tone="warn" href="/tasks" />
        <Kpi label="要確認の案件" value={attention.length} hint="超過・放置・保留" tone={attention.length ? "warn" : "good"} href="/projects" />
        <Kpi label="今月の対応履歴" value={monthActivities} hint="全員分" tone="plain" href="/audit" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">要確認の案件</h2>
              <Link href="/projects" className="text-xs text-primary">すべて見る</Link>
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
                        <div className="truncate font-bold">{p.name}</div>
                        <div className="truncate text-xs text-muted">
                          {p.customer.name} · {reasons.map((r) => r.text).join(" / ")}
                        </div>
                      </div>
                      <span className={`badge ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">期限が近いタスク</h2>
              <Link href="/tasks" className="text-xs text-primary">すべて見る</Link>
            </div>
            <div className="card-body flex flex-col gap-1.5">
              {openTasks.slice(0, 8).map((t) => {
                const n = t.dueDate ? daysLeft(t.dueDate) : 0;
                return (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-[7px] border border-line px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{t.title}</div>
                      <div className="truncate text-xs text-muted">
                        {t.project ? t.project.name + " · " : ""}
                        {t.assignee?.name ?? "未割当"}
                      </div>
                    </div>
                    {t.assignee ? <Avatar name={t.assignee.name} color={t.assignee.color} /> : null}
                    <div className={`tnum flex flex-col text-right leading-tight ${n < 0 ? "text-bad" : ""}`}>
                      <span>{fmtDate(t.dueDate)}</span>
                      <small className={`text-[11px] ${n < 0 ? "font-bold text-bad" : n <= 3 ? "font-bold text-warn" : "text-muted"}`}>{t.dueDate ? dueLabel(t.dueDate) : ""}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">案件ステータス</h2>
            </div>
            <div className="card-body">
              <div className="my-1.5 flex h-3 overflow-hidden rounded-full bg-surface-3">
                {STATUS_ORDER.filter((s) => countOf(s) > 0).map((s) => (
                  <span key={s} style={{ width: `${(countOf(s) / Math.max(total, 1)) * 100}%`, background: STATUS_COLOR[s] }} title={`${STATUS_LABEL[s]} ${countOf(s)}件`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-ink-2">
                {STATUS_ORDER.map((s) => (
                  <span key={s}>
                    <i className="mr-1.5 inline-block h-[9px] w-[9px] rounded-[2px] align-middle" style={{ background: STATUS_COLOR[s] }} />
                    {STATUS_LABEL[s]} <b className="tnum">{countOf(s)}</b>
                  </span>
                ))}
              </div>
              <h3 className="mt-4 text-[13.5px] font-bold">今後14日の期限</h3>
              <div className="mt-2 grid grid-cols-14 gap-1">
                {days.map(({ d }) => (
                  <div key={"w" + d.getTime()} className="text-center text-[10px] text-muted">{WEEKDAY[d.getDay()]}</div>
                ))}
                {days.map(({ d, n }, i) => (
                  <div
                    key={d.getTime()}
                    title={`${fmtDate(d)}：期限のタスク ${n}件`}
                    className={`tnum flex aspect-square items-center justify-center rounded text-[11px] ${
                      n >= 3 ? "bg-info font-bold text-white" : n > 0 ? "bg-info-soft font-bold text-info" : "bg-surface-3 text-muted"
                    } ${i === 0 ? "outline outline-2 -outline-offset-2 outline-primary" : ""} ${d.getDay() === 0 || d.getDay() === 6 ? "opacity-60" : ""}`}
                  >
                    {d.getDate()}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="text-[15px] font-bold">最近の対応履歴</h2>
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
                        {a.project ? <span className="text-primary">{a.project.name}　</span> : a.customer ? <span className="text-primary">{a.customer.name}　</span> : null}
                        {a.body}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="flex items-start gap-2.5 rounded-[7px] bg-violet-soft px-3 py-2.5 text-[13px] text-violet">
            <Icon name="spark" size={16} className="mt-0.5 shrink-0" />
            <div>
              <b>AIアシスト</b>はステージ9で有効化します。引き継ぎメモの下書きや自然言語での検索を、効果の見えた箇所から入れていきます。
            </div>
          </div>
          <p className="text-[12px] text-muted">
            最終対応 {recentActivities[0] ? ago(recentActivities[0].occurredAt) : "—"} · DB 接続 <Link href="/api/health" className="underline">/api/health</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
