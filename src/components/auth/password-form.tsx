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

  if (state?.ok) return <p className="rounded-[7px] bg-good-soft px-3 py-2 text-[13px] text-good">パスワードを変更しました。他の端末のログインは解除されています</p>;

  return (
    <form action={action} className="card">
      <div className="card-body flex flex-col gap-4">
        <Field label="今のパスワード" htmlFor="current" required errors={state?.errors?.current}>
          <input id="current" name="current" type="password" autoComplete="current-password" className={inputClass} required />
        </Field>
        <Field label="新しいパスワード" htmlFor="password" required errors={state?.errors?.password} hint="8文字以上">
          <input id="password" name="password" type="password" autoComplete="new-password" className={inputClass} required minLength={8} />
        </Field>
        <Field label="新しいパスワード（確認）" htmlFor="confirm" required errors={state?.errors?.confirm}>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={inputClass} required />
        </Field>
      </div>
      <div className="flex justify-end border-t border-line px-4 py-3">
        <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">{pending ? "変更中…" : "変更する"}</button>
      </div>
    </form>
  );
}
