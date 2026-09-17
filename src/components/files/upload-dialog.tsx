"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Field, inputClass } from "@/components/ui/field";

type Opt = { id: string; name: string };
export type UploadOptions = { projects: Opt[]; customers: Opt[] };
type Preset = { projectId?: string; customerId?: string };

function Dialog({ options, preset, lockTarget, onClose }: { options: UploadOptions; preset: Preset; lockTarget: boolean; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState(preset.projectId ?? "");
  const [customerId, setCustomerId] = useState(preset.customerId ?? "");
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const lockedName = lockTarget ? (options.projects.find((p) => p.id === preset.projectId)?.name ?? options.customers.find((c) => c.id === preset.customerId)?.name) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = Array.from(fileRef.current?.files ?? []);
    if (!files.length) {
      setErrors(["ファイルを選んでください"]);
      return;
    }
    if (!projectId && !customerId) {
      setErrors(["案件か顧客のどちらかを選んでください"]);
      return;
    }
    setErrors([]);
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(`アップロード中 ${i + 1}/${files.length}：${files[i].name}`);
      const fd = new FormData();
      fd.set("file", files[i]);
      fd.set("projectId", projectId);
      fd.set("customerId", projectId ? "" : customerId);
      try {
        const res = await fetch("/api/files", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) failed.push(json.message ?? `「${files[i].name}」の保存に失敗しました`);
      } catch {
        failed.push(`「${files[i].name}」の送信に失敗しました`);
      }
    }
    setProgress(null);
    router.refresh();
    if (failed.length) setErrors(failed);
    else onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current && !progress) onClose();
      }}
      className="m-auto w-[min(560px,calc(100%-32px))] rounded-xl border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_rgba(18,28,40,0.22)] backdrop:bg-[rgba(10,18,28,0.5)]"
    >
      <form onSubmit={submit}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-bold">ファイルを追加</h2>
          <button type="button" onClick={onClose} disabled={!!progress} aria-label="閉じる" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2">✕</button>
        </div>
        <div className="grid gap-4 px-4 py-4">
          {errors.length ? (
            <ul className="rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad">
              {errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
          <Field label="ファイル（複数可）" htmlFor="upload-file" required>
            <input
              ref={fileRef}
              id="upload-file"
              type="file"
              multiple
              className="block w-full text-[13px] file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-[13px] file:font-bold"
            />
          </Field>
          {lockedName ? (
            <div>
              <div className="text-[12.5px] text-muted">{preset.projectId ? "案件" : "顧客"}</div>
              <div className="mt-1 text-[13.5px] font-bold">{lockedName}</div>
            </div>
          ) : (
            <>
              <Field label="案件" htmlFor="upload-project">
                <select id="upload-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
                  <option value="">（案件に紐づけない）</option>
                  {options.projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="顧客・取引先（案件を選ばない場合）" htmlFor="upload-customer">
                <select id="upload-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!!projectId} className={`${inputClass} disabled:opacity-60`}>
                  <option value="">（選択）</option>
                  {options.customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <p className="text-[12px] text-muted">同じ場所に同じ名前のファイルを追加すると、上書きせず新しい版（v2, v3…）として保存され、前の版もあとから取り出せます。</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          {progress ? <span className="mr-auto truncate text-[12.5px] text-muted">{progress}</span> : null}
          <button type="button" onClick={onClose} disabled={!!progress} className="btn">キャンセル</button>
          <button type="submit" disabled={!!progress} className="btn btn-primary disabled:opacity-60">{progress ? "送信中…" : "アップロード"}</button>
        </div>
      </form>
    </dialog>
  );
}

export function UploadButton({ options, preset = {}, lockTarget = false, label = "＋ ファイルを追加", className = "btn btn-primary" }: { options: UploadOptions; preset?: Preset; lockTarget?: boolean; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open ? <Dialog options={options} preset={preset} lockTarget={lockTarget} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
