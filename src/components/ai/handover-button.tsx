"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { draftHandoverAction, saveHandoverAction } from "@/actions/ai";
import { Icon } from "@/components/icons";
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
      } else setError(res.message ?? "下書きを作れませんでした");
    });
  }, [projectId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("コピーできませんでした。本文を選択してコピーしてください");
    }
  };

  const save = () =>
    start(async () => {
      const res = await saveHandoverAction(projectId, title, body);
      if (res?.message) setError(res.message);
    });

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(760px,calc(100%-32px))] rounded-xl border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_rgba(18,28,40,0.22)] backdrop:bg-[rgba(10,18,28,0.5)]"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Icon name="spark" size={16} className="text-violet" />
          引き継ぎメモの下書き
        </h2>
        <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2">✕</button>
      </div>
      <div className="px-4 py-4">
        {!draft && !error ? (
          <div className="flex items-center gap-3 py-8 text-[13.5px] text-violet">
            <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-violet-soft border-t-violet" />
            対応履歴・タスク・社内メモ・資料を読んで下書きしています…
          </div>
        ) : null}
        {error ? <p className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad">{error}</p> : null}
        {draft ? (
          <>
            <div className="mb-3 flex items-start gap-2.5 rounded-[7px] bg-violet-soft px-3 py-2.5 text-[13px] text-violet">
              <Icon name="spark" size={16} className="mt-0.5 shrink-0" />
              <div>
                この案件の対応履歴・未完了タスク・社内メモ・資料から自動で下書きしました。内容を確認して、必要なら直してから保存してください。
                <span className="ml-1 rounded-full bg-surface px-2 text-[11px]">{draft.source === "ai" ? "AI で文章を整形" : "ルールベース"}</span>
              </div>
            </div>
            <label className="mb-1 block text-[12.5px] text-muted" htmlFor="handover-title">タイトル</label>
            <input id="handover-title" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} mb-3`} maxLength={120} />
            <label className="mb-1 block text-[12.5px] text-muted" htmlFor="handover-body">本文</label>
            <textarea id="handover-body" value={body} onChange={(e) => setBody(e.target.value)} rows={18} className={`${textareaClass} font-mono text-[12.5px] leading-relaxed`} maxLength={8000} />
          </>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
        <button type="button" onClick={onClose} className="btn">閉じる</button>
        {draft ? (
          <>
            <button type="button" onClick={copy} className="btn">{copied ? "コピーしました" : "コピー"}</button>
            <button type="button" onClick={save} disabled={pending} className="btn btn-primary disabled:opacity-60">{pending ? "保存中…" : "社内メモとして保存"}</button>
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
      <button type="button" onClick={() => setOpen(true)} className="btn border-transparent bg-violet-soft text-violet hover:bg-violet-soft hover:brightness-95">
        <Icon name="spark" size={15} />引き継ぎメモを下書き
      </button>
      {open ? <Dialog projectId={projectId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
