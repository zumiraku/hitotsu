import type { AuditAction } from "@/generated/prisma/enums";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";
import { fmtDateTime } from "@/lib/format";

export const ACTION_LABEL: Record<AuditAction, string> = { CREATE: "作成", UPDATE: "更新", DELETE: "削除", STATUS: "ステータス変更", ROLE: "権限変更", IMPORT: "CSV取込", EXPORT: "CSV出力", LOGIN: "ログイン" };
export const ACTION_CLASS: Record<AuditAction, string> = { CREATE: "bg-good-soft text-good", UPDATE: "bg-neutral-soft text-neutral", DELETE: "bg-bad-soft text-bad", STATUS: "bg-warn-soft text-warn", ROLE: "bg-warn-soft text-warn", IMPORT: "bg-good-soft text-good", EXPORT: "bg-info-soft text-info", LOGIN: "bg-neutral-soft text-neutral" };
export const TARGET_LABEL: Record<string, string> = { project: "案件", customer: "顧客", task: "タスク", note: "メモ", user: "ユーザー", file: "ファイル", system: "システム" };

export type AuditChange = { field: string; from: string; to: string };
export type AuditItem = { id: string; action: AuditAction; changes: unknown; createdAt: Date; user: { name: string; color: string } | null };

export function asChanges(v: unknown): AuditChange[] {
  return Array.isArray(v) ? (v as AuditChange[]) : [];
}

export function ChangeList({ changes, className = "" }: { changes: AuditChange[]; className?: string }) {
  if (!changes.length) return null;
  return (
    <ul className={`text-xs text-ink-2 ${className}`}>
      {changes.map((ch, i) => (
        <li key={i} className="break-words">
          <span className="text-muted">{ch.field}</span>：<span className="text-bad line-through">{ch.from}</span> → <b className="text-good">{ch.to}</b>
        </li>
      ))}
    </ul>
  );
}

export function AuditList({ items }: { items: AuditItem[] }) {
  if (items.length === 0) return <Empty>変更履歴はありません</Empty>;
  return (
    <ul className="divide-y divide-line">
      {items.map((l) => (
        <li key={l.id} className="flex gap-2.5 py-2">
          {l.user ? <Avatar name={l.user.name} color={l.user.color} /> : null}
          <div className="min-w-0 flex-1">
            <div className="text-[13px]">
              <b>{ACTION_LABEL[l.action]}</b>
              <span className="ml-2 text-xs text-muted">{l.user?.name} · {fmtDateTime(l.createdAt)}</span>
            </div>
            <ChangeList changes={asChanges(l.changes)} className="mt-0.5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
