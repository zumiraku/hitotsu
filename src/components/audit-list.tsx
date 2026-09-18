import type { AuditAction } from "@/generated/prisma/enums";
import { fmtDateTime } from "@/lib/format";

export const ACTION_LABEL: Record<AuditAction, string> = { CREATE: "登録", UPDATE: "更新", DELETE: "削除", STATUS: "ステータス変更", ROLE: "権限変更", IMPORT: "CSV取込", EXPORT: "CSV出力", LOGIN: "ログイン" };
export const TARGET_LABEL: Record<string, string> = { project: "案件", customer: "顧客", task: "タスク", note: "メモ", user: "ユーザー", file: "ファイル", system: "システム" };

export type AuditChange = { field: string; from: string; to: string };
export type AuditItem = { id: string; action: AuditAction; changes: unknown; createdAt: Date; user: { name: string } | null };

export function asChanges(v: unknown): AuditChange[] {
  return Array.isArray(v) ? (v as AuditChange[]) : [];
}

export function ChangeList({ changes, className = "" }: { changes: AuditChange[]; className?: string }) {
  if (!changes.length) return null;
  return (
    <ul className={`text-[12px] ${className}`}>
      {changes.map((ch, i) => (
        <li key={i} className="break-words">
          {ch.field}：{ch.from || "（なし）"} → {ch.to || "（なし）"}
        </li>
      ))}
    </ul>
  );
}

export function AuditList({ items }: { items: AuditItem[] }) {
  if (items.length === 0) return <p className="text-muted">変更履歴はありません。</p>;
  return (
    <ul className="text-[12.5px]">
      {items.map((l) => (
        <li key={l.id} className="border-b border-line-2 py-1.5 last:border-b-0">
          <div>
            <span className="tnum text-muted">{fmtDateTime(l.createdAt)}</span>
            <span className="ml-2">{l.user?.name}</span>
            <span className="ml-2 font-bold">{ACTION_LABEL[l.action]}</span>
          </div>
          <ChangeList changes={asChanges(l.changes)} className="pl-2 text-ink-2" />
        </li>
      ))}
    </ul>
  );
}
