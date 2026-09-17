import type { TaskItem } from "@/components/tasks/task-row";
import { daysLeft, dueLabel, fmtDate, toInputDate } from "@/lib/format";

type TaskLike = {
  id: string;
  title: string;
  done: boolean;
  dueDate: Date | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string; color: string } | null;
};

// Client Component に渡せる形（Date を含まない）に変換する
export function toTaskItem(t: TaskLike): TaskItem {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    dueDate: t.dueDate ? toInputDate(t.dueDate) : null,
    dueText: fmtDate(t.dueDate),
    dueHint: t.dueDate ? dueLabel(t.dueDate) : "",
    daysLeft: t.dueDate ? daysLeft(t.dueDate) : null,
    project: t.project,
    assignee: t.assignee,
  };
}

export const taskInclude = {
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, color: true } },
} as const;
