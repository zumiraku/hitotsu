"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import type { TaskFormState } from "@/actions/tasks";
import { Field, inputClass } from "@/components/ui/field";

export type TaskOptions = {
  projects: { id: string; name: string }[];
  users: { id: string; name: string }[];
};

export type TaskInitial = { title: string; projectId: string; assigneeId: string; dueDate: string };

type Props = {
  title: string;
  action: (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  initial: TaskInitial;
  options: TaskOptions;
  submitLabel: string;
  onClose: () => void;
};

export function TaskDialog({ title, action, initial, options, submitLabel, onClose }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const v = (k: keyof TaskInitial) => state?.values?.[k] ?? initial[k];
  const err = (k: keyof TaskInitial) => state?.errors?.[k];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(560px,calc(100%-32px))] rounded-xl border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_rgba(18,28,40,0.22)] backdrop:bg-[rgba(10,18,28,0.5)]"
    >
      <form action={formAction}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2">✕</button>
        </div>
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          {state?.message ? <p className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2">{state.message}</p> : null}
          <Field label="タスク名" htmlFor="task-title" required errors={err("title")} className="sm:col-span-2">
            <input id="task-title" name="title" defaultValue={v("title")} className={inputClass} autoFocus maxLength={200} placeholder="例：見積書v3の回答を確認" />
          </Field>
          <Field label="案件" htmlFor="task-project" errors={err("projectId")} className="sm:col-span-2">
            <select id="task-project" name="projectId" defaultValue={v("projectId")} className={inputClass}>
              <option value="">（案件に紐づけない）</option>
              {options.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="担当" htmlFor="task-assignee" errors={err("assigneeId")}>
            <select id="task-assignee" name="assigneeId" defaultValue={v("assigneeId")} className={inputClass}>
              <option value="">（未割当）</option>
              {options.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
          <Field label="期限" htmlFor="task-due" errors={err("dueDate")}>
            <input id="task-due" name="dueDate" type="date" defaultValue={v("dueDate")} className={inputClass} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button type="button" onClick={onClose} className="btn">キャンセル</button>
          <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">{pending ? "保存中…" : submitLabel}</button>
        </div>
      </form>
    </dialog>
  );
}
