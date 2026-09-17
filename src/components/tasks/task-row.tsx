"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { createTask, deleteTask, toggleTask, updateTask } from "@/app/tasks/actions";
import { Icon } from "@/components/icons";
import { TaskDialog, type TaskInitial, type TaskOptions } from "@/components/tasks/task-dialog";
import { Avatar } from "@/components/ui/avatar";

export type TaskItem = {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null; // YYYY-MM-DD
  dueText: string; // 表示用 "2026/09/20"
  dueHint: string; // "あと3日" など
  daysLeft: number | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string; color: string } | null;
};

export function TaskRow({ task, options, showProject = true }: { task: TaskItem; options?: TaskOptions; showProject?: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState(task.done);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const closeEdit = useCallback(() => setEditing(false), []);

  const toggle = () => {
    const next = !done;
    setDone(next);
    start(async () => {
      const res = await toggleTask(task.id, next);
      if (res.message) {
        setDone(!next);
        setError(res.message);
      } else {
        setError(null);
        router.refresh();
      }
    });
  };

  const remove = () => {
    if (!window.confirm(`「${task.title}」を削除します。よろしいですか？`)) return;
    start(async () => {
      const res = await deleteTask(task.id);
      if (res.message) setError(res.message);
      else router.refresh();
    });
  };

  const n = task.daysLeft;
  const dueClass = done ? "text-muted" : n !== null && n < 0 ? "font-bold text-bad" : n !== null && n <= 3 ? "font-bold text-warn" : "text-muted";

  return (
    <div className={`group flex items-center gap-2.5 rounded-[7px] border border-line bg-surface px-3 py-2 ${pending ? "opacity-70" : ""}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? "未完了に戻す" : "完了にする"}
        onClick={toggle}
        disabled={pending}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${done ? "border-good bg-good text-white" : "border-line-strong bg-surface hover:border-good"}`}
      >
        {done ? <Icon name="check" size={12} strokeWidth={2.4} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`truncate font-bold ${done ? "text-muted line-through" : ""}`}>{task.title}</div>
        <div className="truncate text-xs text-muted">
          {showProject && task.project ? (
            <>
              <Link href={`/projects/${task.project.id}`} className="hover:underline">{task.project.name}</Link>
              {" · "}
            </>
          ) : null}
          {task.assignee?.name ?? "未割当"}
          {error ? <span className="ml-2 text-bad">{error}</span> : null}
        </div>
      </div>
      {task.assignee ? <Avatar name={task.assignee.name} color={task.assignee.color} /> : null}
      <div className="tnum w-[84px] shrink-0 text-right text-[13px] leading-tight">
        {done ? (
          <span className="text-muted">完了</span>
        ) : task.dueDate ? (
          <>
            <div className={n !== null && n < 0 ? "text-bad" : ""}>{task.dueText}</div>
            <div className={`text-[11px] ${dueClass}`}>{task.dueHint}</div>
          </>
        ) : (
          <span className="text-muted">期限なし</span>
        )}
      </div>
      {options ? (
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button type="button" onClick={() => setEditing(true)} aria-label="編集" title="編集" className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
            <Icon name="edit" size={15} />
          </button>
          <button type="button" onClick={remove} aria-label="削除" title="削除" className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-bad-soft hover:text-bad">
            <Icon name="trash" size={15} />
          </button>
        </div>
      ) : null}
      {editing && options ? (
        <TaskDialog
          title="タスクを編集"
          action={updateTask.bind(null, task.id)}
          options={options}
          submitLabel="保存する"
          onClose={closeEdit}
          initial={{ title: task.title, projectId: task.project?.id ?? "", assigneeId: task.assignee?.id ?? "", dueDate: task.dueDate ?? "" }}
        />
      ) : null}
    </div>
  );
}

export function AddTaskButton({ options, preset, label = "＋ タスクを追加", className = "btn btn-primary" }: { options: TaskOptions; preset?: Partial<TaskInitial>; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open ? (
        <TaskDialog
          title="タスクを追加"
          action={createTask}
          options={options}
          submitLabel="追加する"
          onClose={close}
          initial={{ title: "", projectId: "", assigneeId: "", dueDate: "", ...preset }}
        />
      ) : null}
    </>
  );
}
