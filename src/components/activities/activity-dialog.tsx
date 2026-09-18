"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import type { ActivityFormState } from "@/actions/activities";
import { Field, textareaClass } from "@/components/ui/field";
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
    <dialog ref={ref} onClose={onClose} className="dlg w-[min(620px,calc(100%-32px))]">
      <form action={formAction}>
        <div className="dlg-head">
          <span>{title}</span>
          <button type="button" onClick={onClose} className="text-[12px] font-normal text-link hover:underline">閉じる</button>
        </div>
        <div className="p-3">
          {state?.message ? <p className="msg-bad mb-3">{state.message}</p> : null}
          <div className="form">
            {lockedProject || lockedCustomer ? (
              <Field label={lockedProject ? "案件" : "顧客"}>
                {lockedProject?.name ?? lockedCustomer?.name}
                <input type="hidden" name="projectId" value={lockedProject ? initial.projectId : ""} />
                <input type="hidden" name="customerId" value={lockedCustomer ? initial.customerId : ""} />
              </Field>
            ) : (
              <>
                <Field label="案件" htmlFor="act-project" errors={err("projectId")}>
                  <select id="act-project" name="projectId" defaultValue={v("projectId")} className="inp max-w-full">
                    <option value="">（案件なし・顧客に直接記録）</option>
                    {options.projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="顧客" htmlFor="act-customer" errors={err("customerId")} hint="案件を選ばない場合に指定してください。">
                  <select id="act-customer" name="customerId" defaultValue={v("customerId")} className="inp max-w-full">
                    <option value="">（選択）</option>
                    {options.customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            <Field label="種別" htmlFor="act-type" required errors={err("type")}>
              <select id="act-type" name="type" defaultValue={v("type")} className="inp">
                {Object.entries(ACTIVITY_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="日時" htmlFor="act-time" errors={err("occurredAt")}>
              <input ref={timeRef} id="act-time" name="occurredAt" type="datetime-local" defaultValue={v("occurredAt")} className="inp" />
            </Field>
            <Field label="内容" htmlFor="act-body" required errors={err("body")}>
              <textarea id="act-body" name="body" defaultValue={v("body")} rows={5} className={textareaClass} autoFocus maxLength={2000} />
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
