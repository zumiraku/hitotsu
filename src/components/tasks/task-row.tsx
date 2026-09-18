"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { createTask, deleteTask, toggleTask, updateTask } from "@/actions/tasks";
import { TaskDialog, type TaskInitial, type TaskOptions } from "@/components/tasks/task-dialog";

export type TaskItem = {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null; // YYYY-MM-DD
  dueText: string; // 表示用 "2026/09/20"
  dueHint: string; // "あと3日" など
  daysLeft: number | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
};

// 一覧表の1行。thead 側の列は呼び出し元で揃えること（チェック／タスク名／案件／担当／期限／操作）
export function TaskRow({ task, options, showProject = true, readOnly = false }: { task: TaskItem; options?: TaskOptions; showProject?: boolean; readOnly?: boolean }) {
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
  const dueClass = done ? "text-muted" : n !== null && n < 0 ? "text-bad" : n !== null && n <= 3 ? "text-warn" : "";

  return (
    <tr className={`tr-link ${pending ? "opacity-60" : ""}`}>
      <td className="td text-center">
        <input type="checkbox" checked={done} onChange={toggle} disabled={pending || readOnly} aria-label={done ? "未完了に戻す" : "完了にする"} className="align-middle" />
      </td>
      <td className="td">
        <span className={done ? "text-muted line-through" : ""}>{task.title}</span>
        {error ? <span className="ml-2 text-[12px] text-bad">{error}</span> : null}
      </td>
      {showProject ? <td className="td">{task.project ? <Link href={`/projects/${task.project.id}`}>{task.project.name}</Link> : <span className="text-muted">－</span>}</td> : null}
      <td className="td whitespace-nowrap">{task.assignee?.name ?? <span className="text-muted">未割当</span>}</td>
      <td className={`td tnum whitespace-nowrap ${dueClass}`}>
        {done ? "完了" : task.dueDate ? (
          <>
            {task.dueText}
            <span className="ml-1 text-[11px]">（{task.dueHint}）</span>
          </>
        ) : (
          <span className="text-muted">期限なし</span>
        )}
      </td>
      {options ? (
        <td className="td whitespace-nowrap text-center">
          <button type="button" onClick={() => setEditing(true)} className="text-link hover:underline">編集</button>
          <span className="mx-1 text-muted">|</span>
          <button type="button" onClick={remove} className="text-link hover:underline">削除</button>
          {editing ? (
            <TaskDialog
              title="タスクの編集"
              action={updateTask.bind(null, task.id)}
              options={options}
              submitLabel="更新"
              onClose={closeEdit}
              initial={{ title: task.title, projectId: task.project?.id ?? "", assigneeId: task.assignee?.id ?? "", dueDate: task.dueDate ?? "" }}
            />
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}

export function TaskTableHead({ showProject = true, actions = false }: { showProject?: boolean; actions?: boolean }) {
  return (
    <thead>
      <tr>
        <th className="th w-8"></th>
        <th className="th">タスク名</th>
        {showProject ? <th className="th">案件</th> : null}
        <th className="th">担当</th>
        <th className="th">期限</th>
        {actions ? <th className="th w-24">操作</th> : null}
      </tr>
    </thead>
  );
}

export function AddTaskButton({ options, preset, label = "タスク登録", className = "btn" }: { options: TaskOptions; preset?: Partial<TaskInitial>; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open ? (
        <TaskDialog
          title="タスクの登録"
          action={createTask}
          options={options}
          submitLabel="登録"
          onClose={close}
          initial={{ title: "", projectId: "", assigneeId: "", dueDate: "", ...preset }}
        />
      ) : null}
    </>
  );
}
