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
    <dialog ref={ref} onClose={onClose} className="dlg w-[min(560px,calc(100%-32px))]">
      {state?.created ? (
        <div>
          <div className="dlg-head">
            <span>ユーザーを登録しました</span>
          </div>
          <div className="p-3 text-[13px]">
            <p>{state.created.name} さんに、下記の情報を直接お伝えください。初回ログイン時にパスワードの変更を求められます。</p>
            <table className="kv mt-3 border border-line">
              <tbody>
                <tr>
                  <th className="w-[120px]">メールアドレス</th>
                  <td>{state.created.email}</td>
                </tr>
                <tr>
                  <th>仮パスワード</th>
                  <td className="font-mono text-[14px] font-bold">{state.created.password}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-bad">※ 仮パスワードはこの画面を閉じると再表示できません。必要な場合は一覧の「パスワード再発行」から新しく発行してください。</p>
          </div>
          <div className="dlg-foot">
            <button type="button" onClick={onClose} className="btn btn-primary">閉じる</button>
          </div>
        </div>
      ) : (
        <form action={action}>
          <div className="dlg-head">
            <span>ユーザーの登録</span>
            <button type="button" onClick={onClose} className="text-[12px] font-normal text-link hover:underline">閉じる</button>
          </div>
          <div className="p-3">
            {state?.message ? <p className="msg-bad mb-3">{state.message}</p> : null}
            <div className="form">
              <Field label="氏名" htmlFor="inv-name" required errors={err("name")}>
                <input id="inv-name" name="name" defaultValue={v("name")} className="inp w-[240px]" autoFocus maxLength={50} placeholder="姓 名" />
              </Field>
              <Field label="所属" htmlFor="inv-dept" errors={err("department")}>
                <input id="inv-dept" name="department" defaultValue={v("department")} className="inp w-[240px]" maxLength={50} />
              </Field>
              <Field label="メールアドレス" htmlFor="inv-email" required errors={err("email")}>
                <input id="inv-email" name="email" type="email" defaultValue={v("email")} className={inputClass} maxLength={100} />
              </Field>
              <Field label="ロール" htmlFor="inv-role" required errors={err("role")}>
                <select id="inv-role" name="role" defaultValue={v("role") || "MEMBER"} className="inp max-w-full">
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}：{ROLE_DESC[r]}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="mt-2 text-[12px] text-muted">※ 仮パスワードを自動で発行します。メールは送信されませんので、発行された仮パスワードを本人に直接お伝えください。</p>
          </div>
          <div className="dlg-foot">
            <button type="button" onClick={onClose} className="btn">キャンセル</button>
            <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "処理中..." : "登録"}</button>
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
      <button type="button" onClick={() => setOpen(true)} className="btn">ユーザー登録</button>
      {open ? <Dialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
