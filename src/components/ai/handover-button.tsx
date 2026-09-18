"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { draftHandoverAction, saveHandoverAction } from "@/actions/ai";
import { inputClass, textareaClass } from "@/components/ui/field";

type Draft = { title: string; body: string; source: "rule" | "ai" };

function Dialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
    start(async () => {
      const res = await draftHandoverAction(projectId);
      if (res.draft) {
        setDraft(res.draft);
        setTitle(res.draft.title);
        setBody(res.draft.body);
      } else setError(res.message ?? "下書きを作成できませんでした。");
    });
  }, [projectId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("コピーできませんでした。本文を選択してコピーしてください。");
    }
  };

  const save = () =>
    start(async () => {
      const res = await saveHandoverAction(projectId, title, body);
      if (res?.message) setError(res.message);
    });

  return (
    <dialog ref={ref} onClose={onClose} className="dlg w-[min(760px,calc(100%-32px))]">
      <div className="dlg-head">
        <span>引き継ぎメモの下書き</span>
        <button type="button" onClick={onClose} className="text-[12px] font-normal text-link hover:underline">閉じる</button>
      </div>
      <div className="p-3">
        {!draft && !error ? <p className="py-6 text-center text-[13px] text-muted">対応履歴・タスク・社内メモ・ファイルの内容から下書きを作成しています...</p> : null}
        {error ? <p className="msg-bad">{error}</p> : null}
        {draft ? (
          <>
            <p className="mb-3 text-[12px] text-muted">※ この案件の対応履歴・未完了タスク・社内メモ・ファイルをもとに自動で作成した下書きです。内容を確認し、必要に応じて修正してから保存してください。</p>
            <label className="mb-1 block text-[12.5px] font-bold" htmlFor="handover-title">タイトル</label>
            <input id="handover-title" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} mb-3`} maxLength={120} />
            <label className="mb-1 block text-[12.5px] font-bold" htmlFor="handover-body">本文</label>
            <textarea id="handover-body" value={body} onChange={(e) => setBody(e.target.value)} rows={18} className={textareaClass} maxLength={8000} />
          </>
        ) : null}
      </div>
      <div className="dlg-foot">
        <button type="button" onClick={onClose} className="btn">閉じる</button>
        {draft ? (
          <>
            <button type="button" onClick={copy} className="btn">{copied ? "コピーしました" : "本文をコピー"}</button>
            <button type="button" onClick={save} disabled={pending} className="btn btn-primary">{pending ? "処理中..." : "社内メモとして保存"}</button>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

export function HandoverButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn">引き継ぎメモ作成</button>
      {open ? <Dialog projectId={projectId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
