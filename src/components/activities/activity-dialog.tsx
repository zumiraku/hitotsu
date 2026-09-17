"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import type { ActivityFormState } from "@/app/activities/actions";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { localNow } from "@/lib/format";
import { ACTIVITY_LABEL } from "@/lib/labels";

export type ActivityOptions = {
  projects: { id: string; name: string }[];
  customers: { id: string; name: string }[];
};

export type ActivityInitial = { type: string; body: string; projectId: string; customerId: string; occurredAt: string };

type Props = {
  title: string;
  action: (prev: ActivityFormState, formData: FormData) => Promise<ActivityFormState>;
  initial: ActivityInitial;
  options: ActivityOptions;
  lockTarget?: boolean;
  submitLabel: string;
  onClose: () => void;
};

export function ActivityDialog({ title, action, initial, options, lockTarget = false, submitLabel, onClose }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLDialogElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.showModal();
    if (timeRef.current && !timeRef.current.value) timeRef.current.value = localNow();
  }, []);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const v = (k: keyof ActivityInitial) => state?.values?.[k] ?? initial[k];
  const err = (k: keyof ActivityInitial) => state?.errors?.[k];
  const lockedProject = lockTarget && initial.projectId ? options.projects.find((p) => p.id === initial.projectId) : null;
  const lockedCustomer = lockTarget && !initial.projectId && initial.customerId ? options.customers.find((c) => c.id === initial.customerId) : null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(600px,calc(100%-32px))] rounded-xl border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_rgba(18,28,40,0.22)] backdrop:bg-[rgba(10,18,28,0.5)]"
    >
      <form action={formAction}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2">✕</button>
        </div>
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          {state?.message ? <p className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2">{state.message}</p> : null}

          {lockedProject || lockedCustomer ? (
            <div className="sm:col-span-2">
              <div className="text-[12.5px] text-muted">{lockedProject ? "案件" : "顧客"}</div>
              <div className="mt-1 text-[13.5px] font-bold">{lockedProject?.name ?? lockedCustomer?.name}</div>
              <input type="hidden" name="projectId" value={lockedProject ? initial.projectId : ""} />
              <input type="hidden" name="customerId" value={lockedCustomer ? initial.customerId : ""} />
            </div>
          ) : (
            <>
              <Field label="案件" htmlFor="act-project" errors={err("projectId")} className="sm:col-span-2">
                <select id="act-project" name="projectId" defaultValue={v("projectId")} className={inputClass}>
                  <option value="">（案件なし・顧客に直接記録）</option>
                  {options.projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="顧客（案件を選ばない場合）" htmlFor="act-customer" errors={err("customerId")} className="sm:col-span-2">
                <select id="act-customer" name="customerId" defaultValue={v("customerId")} className={inputClass}>
                  <option value="">（選択）</option>
                  {options.customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label="種別" htmlFor="act-type" required errors={err("type")}>
            <select id="act-type" name="type" defaultValue={v("type")} className={inputClass}>
              {Object.entries(ACTIVITY_LABEL).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="日時" htmlFor="act-time" errors={err("occurredAt")}>
            <input ref={timeRef} id="act-time" name="occurredAt" type="datetime-local" defaultValue={v("occurredAt")} className={inputClass} />
          </Field>
          <Field label="内容" htmlFor="act-body" required errors={err("body")} className="sm:col-span-2">
            <textarea id="act-body" name="body" defaultValue={v("body")} rows={4} className={textareaClass} autoFocus maxLength={2000} placeholder="誰と・何を話して・次に何をするか" />
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
