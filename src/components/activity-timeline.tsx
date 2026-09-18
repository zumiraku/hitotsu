import Link from "next/link";
import type { ActivityType } from "@/generated/prisma/enums";
import type { ActivityOptions } from "@/components/activities/activity-dialog";
import { ActivityItemMenu } from "@/components/activities/activity-item-menu";
import { fmtDateTime, localNow } from "@/lib/format";
import { ACTIVITY_LABEL } from "@/lib/labels";

export type TimelineItem = {
  id: string;
  type: ActivityType;
  body: string;
  occurredAt: Date;
  projectId?: string | null;
  customerId?: string | null;
  user: { name: string } | null;
  project?: { id: string; name: string } | null;
};

type Props = { items: TimelineItem[]; showProject?: boolean; options?: ActivityOptions };

export function ActivityTimeline({ items, showProject = false, options }: Props) {
  if (items.length === 0) return <p className="text-muted">対応履歴はまだ登録されていません。</p>;
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            <th className="th">日時</th>
            <th className="th">種別</th>
            <th className="th">担当</th>
            {showProject ? <th className="th">案件</th> : null}
            <th className="th w-full">内容</th>
            {options ? <th className="th w-24">操作</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="align-top">
              <td className="td tnum whitespace-nowrap">{fmtDateTime(a.occurredAt)}</td>
              <td className="td whitespace-nowrap">{ACTIVITY_LABEL[a.type]}</td>
              <td className="td whitespace-nowrap">{a.user?.name}</td>
              {showProject ? <td className="td">{a.project ? <Link href={`/projects/${a.project.id}`}>{a.project.name}</Link> : <span className="text-muted">－</span>}</td> : null}
              <td className="td whitespace-pre-wrap break-words">{a.body}</td>
              {options ? (
                <td className="td whitespace-nowrap text-center">
                  <ActivityItemMenu
                    id={a.id}
                    options={options}
                    initial={{ type: a.type, body: a.body, projectId: a.projectId ?? a.project?.id ?? "", customerId: a.customerId ?? "", occurredAt: localNow(a.occurredAt) }}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
