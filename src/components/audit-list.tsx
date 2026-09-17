import type { AuditAction } from "@/generated/prisma/enums";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";
import { fmtDateTime } from "@/lib/format";

export const ACTION_LABEL: Record<AuditAction, string> = { CREATE: "作成", UPDATE: "更新", DELETE: "削除", STATUS: "ステータス変更", ROLE: "権限変更", IMPORT: "CSV取込", EXPORT: "CSV出力", LOGIN: "ログイン" };

export type AuditItem = { id: string; action: AuditAction; changes: unknown; createdAt: Date; user: { name: string; color: string } | null };

export function AuditList({ items }: { items: AuditItem[] }) {
  if (items.length === 0) return <Empty>変更履歴はありません</Empty>;
  return (
    <ul className="divide-y divide-line">
      {items.map((l) => {
        const changes = Array.isArray(l.changes) ? (l.changes as { field: string; from: string; to: string }[]) : [];
        return (
          <li key={l.id} className="flex gap-2.5 py-2">
            {l.user ? <Avatar name={l.user.name} color={l.user.color} /> : null}
            <div className="min-w-0 flex-1">
              <div className="text-[13px]">
                <b>{ACTION_LABEL[l.action]}</b>
                <span className="ml-2 text-xs text-muted">{l.user?.name} · {fmtDateTime(l.createdAt)}</span>
              </div>
              {changes.length ? (
                <ul className="mt-0.5 text-xs text-ink-2">
                  {changes.map((ch, i) => (
                    <li key={i} className="break-words"><span className="text-muted">{ch.field}</span>：<span className="text-bad line-through">{ch.from}</span> → <b className="text-good">{ch.to}</b></li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
