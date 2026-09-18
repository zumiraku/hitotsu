import { db } from "@/lib/db";
import { daysLeft, daysSince, startOfToday } from "@/lib/format";
import { liveProject } from "@/lib/scope";

// ホーム画面の「本日の状況」。件数は DB から取り、文章は定型で組み立てる
export async function dailySummary(userId: string) {
  const today = startOfToday();
  const utc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const [overdue, todayTasks, mineOverdue, active, soon] = await Promise.all([
    db.task.count({ where: { done: false, dueDate: { lt: utc }, ...liveProject } }),
    db.task.count({ where: { done: false, dueDate: utc, ...liveProject } }),
    db.task.findMany({ where: { done: false, assigneeId: userId, dueDate: { lte: utc }, ...liveProject }, orderBy: { dueDate: "asc" }, take: 1, select: { title: true } }),
    db.project.findMany({ where: { deletedAt: null, status: "ACTIVE" }, include: { customer: { select: { name: true } }, activities: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } } } }),
    db.project.findMany({ where: { deletedAt: null, status: { in: ["LEAD", "ACTIVE", "HOLD"] }, dueDate: { gte: utc } }, orderBy: { dueDate: "asc" }, include: { customer: { select: { name: true } } } }),
  ]);
  const short = (n: string) => n.replace(/(株式会社|合同会社|有限会社|医療法人)/g, "").trim();
  const stale = active.filter((p) => !p.activities[0] || daysSince(p.activities[0].occurredAt) >= 14);
  const dueSoon = soon.filter((p) => p.dueDate && daysLeft(p.dueDate) <= 7);

  const parts: string[] = [];
  if (overdue) parts.push(`期限超過のタスクが${overdue}件`);
  if (todayTasks) parts.push(`今日期限が${todayTasks}件`);
  let text = parts.length ? parts.join("、") + "あります。" : "期限超過のタスクはありません。";
  if (stale.length) text += `「${stale.slice(0, 3).map((p) => short(p.customer.name)).join("」「")}」の案件は2週間以上対応履歴がありません。`;
  if (dueSoon.length) text += `納期まで1週間以内の案件が${dueSoon.length}件あります。（${dueSoon.slice(0, 3).map((p) => short(p.customer.name)).join("、")}）`;
  if (mineOverdue[0]) text += `ご自身の担当では「${mineOverdue[0].title}」が期限を迎えています。`;
  return text;
}
