import Link from "next/link";
import type { ActivityType } from "@/generated/prisma/enums";
import { Icon } from "@/components/icons";
import { Empty } from "@/components/ui/empty";
import { fmtDateTime } from "@/lib/format";
import { ACTIVITY_LABEL } from "@/lib/labels";

const ICON: Record<ActivityType, string> = { CALL: "phone", MAIL: "mail", VISIT: "pin", MEETING: "chat", MEMO: "memo" };

export type TimelineItem = {
  id: string;
  type: ActivityType;
  body: string;
  occurredAt: Date;
  user: { name: string } | null;
  project?: { id: string; name: string } | null;
};

export function ActivityTimeline({ items, showProject = false }: { items: TimelineItem[]; showProject?: boolean }) {
  if (items.length === 0) return <Empty>まだ対応履歴がありません</Empty>;
  return (
    <ol className="relative flex flex-col before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-0.5 before:bg-line">
      {items.map((a) => (
        <li key={a.id} className="relative flex gap-3 py-2">
          <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-surface-3 text-ink-2">
            <Icon name={ICON[a.type]} size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded-full border border-line px-2 text-[11px]">{ACTIVITY_LABEL[a.type]}</span>
              <b className="text-ink">{a.user?.name}</b>
              <span>{fmtDateTime(a.occurredAt)}</span>
              {showProject && a.project ? <Link href={`/projects/${a.project.id}`} className="text-primary hover:underline">{a.project.name}</Link> : null}
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px]">{a.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
