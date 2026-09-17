"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { Field, inputClass } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/labels";

type Sample = { email: string; name: string; role: keyof typeof ROLE_LABEL };

export function LoginForm({ next, expired, samples }: { next: string; expired: boolean; samples: Sample[] }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="card">
      <form action={action} className="card-body flex flex-col gap-4 py-5">
        <input type="hidden" name="next" value={next} />
        <h1 className="text-[16px] font-bold">ログイン</h1>
        {expired && !state ? <p className="rounded-[7px] bg-warn-soft px-3 py-2 text-[13px] text-warn">セッションの有効期限が切れました。もう一度ログインしてください</p> : null}
        {state?.message ? <p role="alert" className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad">{state.message}</p> : null}
        <Field label="メールアドレス" htmlFor="email" required>
          <input id="email" name="email" type="email" autoComplete="username" defaultValue={state?.values?.email ?? ""} className={inputClass} autoFocus required />
        </Field>
        <Field label="パスワード" htmlFor="password" required>
          <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} required />
        </Field>
        <button type="submit" disabled={pending} className="btn btn-primary h-10 justify-center disabled:opacity-60">{pending ? "確認中…" : "ログイン"}</button>
      </form>
      {samples.length ? (
        <div className="border-t border-line px-4 py-3 text-[12px] text-muted">
          <div className="mb-1 font-bold">開発用アカウント（パスワードはすべて「password」）</div>
          <ul className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            {samples.map((s) => (
              <li key={s.email} className="truncate">
                {s.name}（{ROLE_LABEL[s.role]}）：<span className="font-mono">{s.email}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
