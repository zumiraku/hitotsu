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
  HANDOVER: "先方の窓口、現在の状況、注意点、最新の資料の場所などを記入してください。",
  RULE: "全員が守る手順や決まりごとを記入してください。決定日と決定者も書いておくと後で確認しやすくなります。",
  MEMO: "気づいた点、先方の要望、打ち合わせの内容などを記入してください。",
};

export function NoteForm({ action, initial, projects, customers, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const v = (k: Exclude<keyof Initial, "pinned">) => state?.values?.[k] ?? initial[k];
  const err = (k: keyof Initial) => state?.errors?.[k];
  const pinned = state?.values ? state.values.pinned === "1" : initial.pinned;

  return (
    <form action={formAction}>
      {state?.message ? <p className="msg-bad mb-3">{state.message}</p> : null}
      <div className="form">
        <Field label="タイトル" htmlFor="title" required errors={err("title")}>
          <input id="title" name="title" defaultValue={v("title")} className={inputClass} autoFocus maxLength={120} />
        </Field>
        <Field label="種類" htmlFor="category" required errors={err("category")}>
          <select id="category" name="category" defaultValue={v("category")} className="inp">
            {Object.entries(NOTE_CATEGORY_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="ピン留め">
          <label className="inline-flex cursor-pointer items-center gap-1">
            <input type="checkbox" name="pinned" value="1" defaultChecked={pinned} />
            ホーム画面に表示する
          </label>
        </Field>
        <Field label="関連する案件" htmlFor="projectId" errors={err("projectId")}>
          <select id="projectId" name="projectId" defaultValue={v("projectId")} className="inp max-w-full">
            <option value="">（なし）</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="関連する顧客・取引先" htmlFor="customerId" errors={err("customerId")}>
          <select id="customerId" name="customerId" defaultValue={v("customerId")} className="inp max-w-full">
            <option value="">（なし）</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="本文" htmlFor="body" required errors={err("body")} hint={HINT[v("category")] ?? HINT.MEMO}>
          <textarea id="body" name="body" defaultValue={v("body")} rows={12} className={textareaClass} maxLength={8000} />
        </Field>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary min-w-[120px] justify-center">{pending ? "処理中..." : submitLabel}</button>
        <Link href={cancelHref} className="btn min-w-[120px] justify-center">キャンセル</Link>
      </div>
    </form>
  );
}
