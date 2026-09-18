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
    <dialog ref={ref} onClose={onClose} className="dlg w-[min(560px,calc(100%-32px))]">
      <form action={formAction}>
        <div className="dlg-head">
          <span>{title}</span>
          <button type="button" onClick={onClose} className="text-[12px] font-normal text-link hover:underline">閉じる</button>
        </div>
        <div className="p-3">
          {state?.message ? <p className="msg-bad mb-3">{state.message}</p> : null}
          <div className="form">
            <Field label="タスク名" htmlFor="task-title" required errors={err("title")}>
              <input id="task-title" name="title" defaultValue={v("title")} className={inputClass} autoFocus maxLength={200} />
            </Field>
            <Field label="案件" htmlFor="task-project" errors={err("projectId")}>
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
              <input id="task-due" name="dueDate" type="date" defaultValue={v("dueDate")} className="inp" />
            </Field>
          </div>
        </div>
        <div className="dlg-foot">
          <button type="button" onClick={onClose} className="btn">キャンセル</button>
          <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "処理中..." : submitLabel}</button>
        </div>
      </form>
    </dialog>
  );
}
