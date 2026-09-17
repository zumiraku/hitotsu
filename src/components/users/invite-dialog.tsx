"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { inviteUser } from "@/actions/users";
import { Field, inputClass } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/labels";
import { ROLE_DESC, ROLE_ORDER } from "@/lib/permissions";

function Dialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(inviteUser, null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (state?.created) router.refresh();
  }, [state, router]);

  const v = (k: string) => state?.values?.[k] ?? "";
  const err = (k: "name" | "email" | "department" | "role") => state?.errors?.[k];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(520px,calc(100%-32px))] rounded-xl border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_rgba(18,28,40,0.22)] backdrop:bg-[rgba(10,18,28,0.5)]"
    >
      {state?.created ? (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-bold">招待しました</h2>
            <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2">✕</button>
          </div>
          <div className="px-4 py-4 text-[13.5px]">
            <p>{state.created.name} さんに、次の情報を伝えてください。初回ログイン後にパスワードの変更を求められます。</p>
            <dl className="dl mt-3 rounded-[7px] bg-surface-2 p-3">
              <dt>メール</dt>
              <dd className="font-mono">{state.created.email}</dd>
              <dt>仮パスワード</dt>
              <dd className="font-mono text-[15px] font-bold">{state.created.password}</dd>
            </dl>
            <p className="mt-2 text-[12px] text-warn">この仮パスワードは閉じると再表示できません。必要なら「PW再発行」で新しく発行できます。</p>
          </div>
          <div className="flex justify-end border-t border-line px-4 py-3">
            <button type="button" onClick={onClose} className="btn btn-primary">閉じる</button>
          </div>
        </div>
      ) : (
        <form action={action}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-bold">ユーザーを招待</h2>
            <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2">✕</button>
          </div>
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            {state?.message ? <p className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2">{state.message}</p> : null}
            <Field label="名前" htmlFor="inv-name" required errors={err("name")}>
              <input id="inv-name" name="name" defaultValue={v("name")} className={inputClass} autoFocus maxLength={50} placeholder="姓 名" />
            </Field>
            <Field label="所属" htmlFor="inv-dept" errors={err("department")}>
              <input id="inv-dept" name="department" defaultValue={v("department")} className={inputClass} maxLength={50} placeholder="例：営業部" />
            </Field>
            <Field label="メールアドレス" htmlFor="inv-email" required errors={err("email")} className="sm:col-span-2">
              <input id="inv-email" name="email" type="email" defaultValue={v("email")} className={inputClass} maxLength={100} />
            </Field>
            <Field label="ロール" htmlFor="inv-role" required errors={err("role")} className="sm:col-span-2">
              <select id="inv-role" name="role" defaultValue={v("role") || "MEMBER"} className={inputClass}>
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}：{ROLE_DESC[r]}</option>
                ))}
              </select>
            </Field>
            <p className="text-[12px] text-muted sm:col-span-2">仮パスワードを自動で発行します。メールは送信しないので、発行された仮パスワードを本人に直接伝えてください。</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
            <button type="button" onClick={onClose} className="btn">キャンセル</button>
            <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">{pending ? "登録中…" : "招待する"}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export function InviteButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">＋ ユーザーを招待</button>
      {open ? <Dialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
