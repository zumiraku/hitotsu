"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ProjectFormState } from "@/actions/projects";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";

type Initial = {
  name: string;
  customerId: string;
  status: string;
  priority: string;
  ownerId: string;
  memberIds: string;
  amount: string;
  startDate: string;
  dueDate: string;
  summary: string;
  tags: string;
};

type Props = {
  action: (prev: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  initial: Initial;
  customers: { id: string; name: string }[];
  users: { id: string; name: string }[];
  submitLabel: string;
  cancelHref: string;
  showAmount?: boolean;
};

export function ProjectForm({ action, initial, customers, users, submitLabel, cancelHref, showAmount = true }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const v = (key: keyof Initial) => state?.values?.[key] ?? initial[key];
  const err = (key: keyof Initial) => state?.errors?.[key];
  const invalid = (key: keyof Initial) => (err(key)?.length ? true : undefined);
  const members = new Set(v("memberIds").split(",").filter(Boolean));

  return (
    <form action={formAction} className="card">
      <div className="card-body grid gap-4 sm:grid-cols-2">
        {state?.message ? <p className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2">{state.message}</p> : null}

        <Field label="案件名" htmlFor="name" required errors={err("name")} className="sm:col-span-2">
          <input id="name" name="name" defaultValue={v("name")} className={inputClass} aria-invalid={invalid("name")} autoFocus maxLength={120} placeholder="例：在庫管理システム刷新" />
        </Field>
        <Field label="顧客・取引先" htmlFor="customerId" required errors={err("customerId")} className="sm:col-span-2">
          <select id="customerId" name="customerId" defaultValue={v("customerId")} className={inputClass} aria-invalid={invalid("customerId")}>
            <option value="">（選択してください）</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="ステータス" htmlFor="status" required errors={err("status")}>
          <select id="status" name="status" defaultValue={v("status")} className={inputClass}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="優先度" htmlFor="priority" required errors={err("priority")}>
          <select id="priority" name="priority" defaultValue={v("priority")} className={inputClass}>
            {Object.entries(PRIORITY_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="担当" htmlFor="ownerId" errors={err("ownerId")}>
          <select id="ownerId" name="ownerId" defaultValue={v("ownerId")} className={inputClass}>
            <option value="">（未割当）</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
        {showAmount ? (
          <Field label="金額（円・税込）" htmlFor="amount" errors={err("amount")}>
            <input id="amount" name="amount" inputMode="numeric" defaultValue={v("amount")} className={`${inputClass} tnum`} aria-invalid={invalid("amount")} placeholder="例：1,200,000" />
          </Field>
        ) : (
          <input type="hidden" name="amount" value={initial.amount} />
        )}
        <Field label="開始日" htmlFor="startDate" errors={err("startDate")}>
          <input id="startDate" name="startDate" type="date" defaultValue={v("startDate")} className={inputClass} aria-invalid={invalid("startDate")} />
        </Field>
        <Field label="納期" htmlFor="dueDate" errors={err("dueDate")}>
          <input id="dueDate" name="dueDate" type="date" defaultValue={v("dueDate")} className={inputClass} aria-invalid={invalid("dueDate")} />
        </Field>
        <div className="sm:col-span-2">
          <div className="text-[12.5px] text-muted">メンバー</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
            {users.map((u) => (
              <label key={u.id} className="inline-flex cursor-pointer items-center gap-1.5 text-[13.5px]">
                <input type="checkbox" name="memberIds" value={u.id} defaultChecked={members.has(u.id)} className="h-4 w-4 accent-primary" />
                {u.name}
              </label>
            ))}
          </div>
          {err("memberIds")?.length ? <p className="mt-1 text-[12px] text-bad">{err("memberIds")!.join("、")}</p> : null}
        </div>
        <Field label="タグ" htmlFor="tags" errors={err("tags")} hint="カンマ区切り。例：システム, 保守" className="sm:col-span-2">
          <input id="tags" name="tags" defaultValue={v("tags")} className={inputClass} aria-invalid={invalid("tags")} />
        </Field>
        <Field label="概要" htmlFor="summary" errors={err("summary")} hint="目的、範囲、決まっていること、注意点など" className="sm:col-span-2">
          <textarea id="summary" name="summary" defaultValue={v("summary")} rows={4} className={textareaClass} aria-invalid={invalid("summary")} maxLength={4000} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
        <Link href={cancelHref} className="btn">キャンセル</Link>
        <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
          {pending ? "保存中…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
