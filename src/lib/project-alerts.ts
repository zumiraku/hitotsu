import type { ProjectStatus } from "@/generated/prisma/enums";
import { daysLeft, daysSince } from "@/lib/format";
import { isClosed } from "@/lib/labels";

export type ProjectAlert = { level: "bad" | "warn"; text: string };

// 「放置」とみなす日数
const STALE_DAYS = 14;

export function projectAlerts(p: { status: ProjectStatus; dueDate: Date | null; overdueTasks: number; lastActivityAt: Date | null }): ProjectAlert[] {
  if (isClosed(p.status)) return [];
  const out: ProjectAlert[] = [];
  if (p.overdueTasks > 0) out.push({ level: "bad", text: `期限超過のタスク ${p.overdueTasks}件` });
  if (p.dueDate && daysLeft(p.dueDate) < 0) out.push({ level: "bad", text: `納期を${-daysLeft(p.dueDate)}日超過` });
  if (p.status === "ACTIVE") {
    if (!p.lastActivityAt) out.push({ level: "warn", text: "対応履歴なし" });
    else if (daysSince(p.lastActivityAt) >= STALE_DAYS) out.push({ level: "warn", text: `最終対応から${daysSince(p.lastActivityAt)}日経過` });
  }
  if (p.status === "HOLD") out.push({ level: "warn", text: "保留中：再開時期を確認" });
  return out;
}
