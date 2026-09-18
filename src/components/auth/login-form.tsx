"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { Field, inputClass } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/labels";

type Sample = { email: string; name: string; role: keyof typeof ROLE_LABEL };

export function LoginForm({ next, expired, samples }: { next: string; expired: boolean; samples: Sample[] }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="box">
      <div className="box-head">ログイン</div>
      <form action={action} className="box-body">
        <input type="hidden" name="next" value={next} />
        {expired && !state ? <p className="msg-warn mb-3">セッションの有効期限が切れました。もう一度ログインしてください。</p> : null}
        {state?.message ? <p role="alert" className="msg-bad mb-3">{state.message}</p> : null}
        <div className="form">
          <Field label="メールアドレス" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="username" defaultValue={state?.values?.email ?? ""} className={inputClass} autoFocus required />
          </Field>
          <Field label="パスワード" htmlFor="password">
            <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} required />
          </Field>
        </div>
        <div className="mt-3 text-center">
          <button type="submit" disabled={pending} className="btn btn-primary min-w-[140px] justify-center">{pending ? "確認中..." : "ログイン"}</button>
        </div>
        <p className="mt-3 text-[11.5px] text-muted">※ パスワードを忘れた場合は、管理者に再発行を依頼してください。</p>
      </form>
      {samples.length ? (
        <div className="border-t border-line bg-surface-2 px-3 py-2 text-[11.5px] text-muted">
          <div className="mb-0.5 font-bold">開発用アカウント（パスワードはすべて「password」）</div>
          <ul>
            {samples.map((s) => (
              <li key={s.email}>
                {s.name}（{ROLE_LABEL[s.role]}）：{s.email}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
