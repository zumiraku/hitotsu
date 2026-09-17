"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { createActivity } from "@/actions/activities";
import { inputBase, textareaClass } from "@/components/ui/field";
import { localNow } from "@/lib/format";
import { ACTIVITY_LABEL } from "@/lib/labels";

// 案件・顧客の詳細ページに置く、その場で記録するためのフォーム
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
    <form ref={formRef} action={formAction} className="mt-3 border-t border-dashed border-line pt-3">
      <input type="hidden" name="projectId" value={projectId ?? ""} />
      <input type="hidden" name="customerId" value={projectId ? "" : (customerId ?? "")} />
      <div className="flex flex-wrap gap-2">
        <select name="type" aria-label="種別" className={inputBase} defaultValue="CALL">
          {Object.entries(ACTIVITY_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
        <input ref={timeRef} name="occurredAt" type="datetime-local" aria-label="日時" className={inputBase} />
        <textarea name="body" rows={2} required maxLength={2000} placeholder="対応内容を記録（例：岡田部長に電話。見積v3は来週の会議で検討とのこと）" className={`${textareaClass} min-w-[220px] flex-1`} />
        <button type="submit" disabled={pending} className="btn btn-primary self-start disabled:opacity-60">{pending ? "記録中…" : "記録する"}</button>
      </div>
      {bodyErr ? <p className="mt-1 text-[12px] text-bad">{bodyErr}</p> : null}
    </form>
  );
}
