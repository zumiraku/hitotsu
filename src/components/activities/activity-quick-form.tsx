"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { createActivity } from "@/actions/activities";
import { localNow } from "@/lib/format";
import { ACTIVITY_LABEL } from "@/lib/labels";

// 案件・顧客の詳細画面に置く、その場で記録するためのフォーム
export function ActivityQuickForm({ projectId, customerId }: { projectId?: string; customerId?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createActivity, null);
  const formRef = useRef<HTMLFormElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timeRef.current && !timeRef.current.value) timeRef.current.value = localNow();
  }, []);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      if (timeRef.current) timeRef.current.value = localNow();
      router.refresh();
    }
  }, [state, router]);

  const bodyErr = state?.errors?.body?.[0] ?? state?.errors?.projectId?.[0] ?? state?.message;

  return (
    <form ref={formRef} action={formAction} className="mt-3 border border-line bg-surface-2 px-3 py-2">
      <div className="mb-1 text-[12px] font-bold">対応履歴の登録</div>
      <input type="hidden" name="projectId" value={projectId ?? ""} />
      <input type="hidden" name="customerId" value={projectId ? "" : (customerId ?? "")} />
      <div className="flex flex-wrap items-start gap-2 text-[12.5px]">
        <label>
          種別：
          <select name="type" className="inp" defaultValue="CALL">
            {Object.entries(ACTIVITY_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          日時：
          <input ref={timeRef} name="occurredAt" type="datetime-local" className="inp" />
        </label>
        <textarea name="body" rows={2} required maxLength={2000} placeholder="対応内容（誰と・何を・次の予定）" className="txt min-w-[240px] flex-1" />
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "処理中..." : "登録"}</button>
      </div>
      {bodyErr ? <p className="mt-1 text-[12px] text-bad">{bodyErr}</p> : null}
    </form>
  );
}
