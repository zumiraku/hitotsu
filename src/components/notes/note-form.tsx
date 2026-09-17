"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { NoteFormState } from "@/actions/notes";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { NOTE_CATEGORY_LABEL } from "@/lib/labels";

type Initial = { title: string; category: string; body: string; projectId: string; customerId: string; pinned: boolean };
type Opt = { id: string; name: string };

type Props = {
  action: (prev: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  initial: Initial;
  projects: Opt[];
  customers: Opt[];
  submitLabel: string;
  cancelHref: string;
};

const HINT: Record<string, string> = {
  HANDOVER: "窓口は誰か・今どういう状況か・気をつけること・最新の資料はどれか",
  RULE: "全員が守る手順や決まりごと。いつから・誰が決めたかも書いておくと後で困りません",
  MEMO: "気づいたこと、先方の要望、打ち合わせのメモなど",
};

export function NoteForm({ action, initial, projects, customers, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const v = (k: Exclude<keyof Initial, "pinned">) => state?.values?.[k] ?? initial[k];
  const err = (k: keyof Initial) => state?.errors?.[k];
  const pinned = state?.values ? state.values.pinned === "1" : initial.pinned;

  return (
    <form action={formAction} className="card">
      <div className="card-body grid gap-4 sm:grid-cols-2">
        {state?.message ? <p className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2">{state.message}</p> : null}
        <Field label="タイトル" htmlFor="title" required errors={err("title")} className="sm:col-span-2">
          <input id="title" name="title" defaultValue={v("title")} className={inputClass} autoFocus maxLength={120} placeholder="例：【引き継ぎ】ミナト運輸さま（田中→鈴木）" />
        </Field>
        <Field label="種類" htmlFor="category" required errors={err("category")}>
          <select id="category" name="category" defaultValue={v("category")} className={inputClass}>
            {Object.entries(NOTE_CATEGORY_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end pb-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px]">
            <input type="checkbox" name="pinned" value="1" defaultChecked={pinned} className="h-4 w-4 accent-primary" />
            ダッシュボードにピン留めする
          </label>
        </div>
        <Field label="関連する案件" htmlFor="projectId" errors={err("projectId")}>
          <select id="projectId" name="projectId" defaultValue={v("projectId")} className={inputClass}>
            <option value="">（なし）</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="関連する顧客・取引先" htmlFor="customerId" errors={err("customerId")}>
          <select id="customerId" name="customerId" defaultValue={v("customerId")} className={inputClass}>
            <option value="">（なし）</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="本文" htmlFor="body" required errors={err("body")} hint={HINT[v("category")] ?? HINT.MEMO} className="sm:col-span-2">
          <textarea id="body" name="body" defaultValue={v("body")} rows={10} className={textareaClass} maxLength={8000} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
        <Link href={cancelHref} className="btn">キャンセル</Link>
        <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">{pending ? "保存中…" : submitLabel}</button>
      </div>
    </form>
  );
}
