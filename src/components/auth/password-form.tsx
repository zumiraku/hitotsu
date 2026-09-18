"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { changePassword } from "@/actions/auth";
import { Field, inputClass } from "@/components/ui/field";

export function PasswordForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(changePassword, null);
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.push("/"), 1200);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  if (state?.ok) return <p className="msg-ok">パスワードを変更しました。他の端末でのログインは解除されています。</p>;

  return (
    <form action={action}>
      <div className="form">
        <Field label="現在のパスワード" htmlFor="current" required errors={state?.errors?.current}>
          <input id="current" name="current" type="password" autoComplete="current-password" className={inputClass} required />
        </Field>
        <Field label="新しいパスワード" htmlFor="password" required errors={state?.errors?.password} hint="8文字以上で設定してください。">
          <input id="password" name="password" type="password" autoComplete="new-password" className={inputClass} required minLength={8} />
        </Field>
        <Field label="新しいパスワード（確認）" htmlFor="confirm" required errors={state?.errors?.confirm}>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={inputClass} required />
        </Field>
      </div>
      <div className="mt-3 text-center">
        <button type="submit" disabled={pending} className="btn btn-primary min-w-[140px] justify-center">{pending ? "処理中..." : "変更"}</button>
      </div>
    </form>
  );
}
