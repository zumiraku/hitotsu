"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CustomerFormState } from "@/app/customers/actions";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { CUSTOMER_TYPE_LABEL } from "@/lib/labels";

type Initial = {
  name: string;
  kana: string;
  type: string;
  industry: string;
  contactName: string;
  contactTitle: string;
  tel: string;
  email: string;
  address: string;
  ownerId: string;
  tags: string;
  note: string;
};

type Props = {
  action: (prev: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  initial: Initial;
  users: { id: string; name: string }[];
  submitLabel: string;
  cancelHref: string;
};

export function CustomerForm({ action, initial, users, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const v = (key: keyof Initial) => state?.values?.[key] ?? initial[key];
  const err = (key: keyof Initial) => state?.errors?.[key];
  const invalid = (key: keyof Initial) => (err(key)?.length ? true : undefined);

  return (
    <form action={formAction} className="card">
      <div className="card-body grid gap-4 sm:grid-cols-2">
        {state?.message ? <p className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2">{state.message}</p> : null}

        <Field label="会社名" htmlFor="name" required errors={err("name")} className="sm:col-span-2">
          <input id="name" name="name" defaultValue={v("name")} className={inputClass} aria-invalid={invalid("name")} autoFocus maxLength={100} />
        </Field>
        <Field label="フリガナ" htmlFor="kana" errors={err("kana")} hint="一覧の並び替えに使います">
          <input id="kana" name="kana" defaultValue={v("kana")} className={inputClass} aria-invalid={invalid("kana")} maxLength={100} />
        </Field>
        <Field label="種別" htmlFor="type" required errors={err("type")}>
          <select id="type" name="type" defaultValue={v("type")} className={inputClass}>
            {Object.entries(CUSTOMER_TYPE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="業種" htmlFor="industry" errors={err("industry")}>
          <input id="industry" name="industry" defaultValue={v("industry")} className={inputClass} aria-invalid={invalid("industry")} maxLength={50} placeholder="例：製造、卸売、不動産" />
        </Field>
        <Field label="社内担当" htmlFor="ownerId" errors={err("ownerId")}>
          <select id="ownerId" name="ownerId" defaultValue={v("ownerId")} className={inputClass}>
            <option value="">（未割当）</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label="先方担当者" htmlFor="contactName" errors={err("contactName")}>
          <input id="contactName" name="contactName" defaultValue={v("contactName")} className={inputClass} aria-invalid={invalid("contactName")} maxLength={50} />
        </Field>
        <Field label="役職・部署" htmlFor="contactTitle" errors={err("contactTitle")}>
          <input id="contactTitle" name="contactTitle" defaultValue={v("contactTitle")} className={inputClass} aria-invalid={invalid("contactTitle")} maxLength={50} />
        </Field>
        <Field label="電話" htmlFor="tel" errors={err("tel")}>
          <input id="tel" name="tel" type="tel" defaultValue={v("tel")} className={inputClass} aria-invalid={invalid("tel")} maxLength={30} />
        </Field>
        <Field label="メール" htmlFor="email" errors={err("email")}>
          <input id="email" name="email" type="email" defaultValue={v("email")} className={inputClass} aria-invalid={invalid("email")} maxLength={100} />
        </Field>
        <Field label="住所" htmlFor="address" errors={err("address")} className="sm:col-span-2">
          <input id="address" name="address" defaultValue={v("address")} className={inputClass} aria-invalid={invalid("address")} maxLength={200} />
        </Field>
        <Field label="タグ" htmlFor="tags" errors={err("tags")} hint="カンマ区切り。例：重要顧客, 20日締め" className="sm:col-span-2">
          <input id="tags" name="tags" defaultValue={v("tags")} className={inputClass} aria-invalid={invalid("tags")} />
        </Field>
        <Field label="社内メモ" htmlFor="note" errors={err("note")} hint="担当が変わっても引き継がれる注意点など" className="sm:col-span-2">
          <textarea id="note" name="note" defaultValue={v("note")} rows={3} className={textareaClass} aria-invalid={invalid("note")} maxLength={2000} />
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
