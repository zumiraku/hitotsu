"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Field } from "@/components/ui/field";

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
      setErrors(["ファイルを選択してください。"]);
      return;
    }
    if (!projectId && !customerId) {
      setErrors(["案件または顧客を選択してください。"]);
      return;
    }
    setErrors([]);
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(`アップロード中（${i + 1}/${files.length}）：${files[i].name}`);
      const fd = new FormData();
      fd.set("file", files[i]);
      fd.set("projectId", projectId);
      fd.set("customerId", projectId ? "" : customerId);
      try {
        const res = await fetch("/api/files", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) failed.push(json.message ?? `「${files[i].name}」の保存に失敗しました。`);
      } catch {
        failed.push(`「${files[i].name}」の送信に失敗しました。`);
      }
    }
    setProgress(null);
    router.refresh();
    if (failed.length) setErrors(failed);
    else onClose();
  };

  return (
    <dialog ref={ref} onClose={onClose} className="dlg w-[min(560px,calc(100%-32px))]">
      <form onSubmit={submit}>
        <div className="dlg-head">
          <span>ファイルの追加</span>
          <button type="button" onClick={onClose} disabled={!!progress} className="text-[12px] font-normal text-link hover:underline">閉じる</button>
        </div>
        <div className="p-3">
          {errors.length ? (
            <ul className="msg-bad mb-3">
              {errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
          <div className="form">
            <Field label="ファイル" htmlFor="upload-file" required hint="複数選択できます。">
              <input ref={fileRef} id="upload-file" type="file" multiple className="block w-full text-[13px]" />
            </Field>
            {lockedName ? (
              <Field label={preset.projectId ? "案件" : "顧客"}>{lockedName}</Field>
            ) : (
              <>
                <Field label="案件" htmlFor="upload-project">
                  <select id="upload-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="inp max-w-full">
                    <option value="">（案件に紐づけない）</option>
                    {options.projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="顧客・取引先" htmlFor="upload-customer" hint="案件を選ばない場合に指定してください。">
                  <select id="upload-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!!projectId} className="inp max-w-full">
                    <option value="">（選択）</option>
                    {options.customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>
          <p className="mt-2 text-[12px] text-muted">※ 同じ場所に同じ名前のファイルを追加した場合は上書きせず、新しい版（第2版、第3版…）として保存されます。前の版もあとから取り出せます。</p>
        </div>
        <div className="dlg-foot">
          {progress ? <span className="mr-auto truncate text-[12px] text-muted">{progress}</span> : null}
          <button type="button" onClick={onClose} disabled={!!progress} className="btn">キャンセル</button>
          <button type="submit" disabled={!!progress} className="btn btn-primary">{progress ? "送信中..." : "アップロード"}</button>
        </div>
      </form>
    </dialog>
  );
}

export function UploadButton({ options, preset = {}, lockTarget = false, label = "ファイル追加", className = "btn" }: { options: UploadOptions; preset?: Preset; lockTarget?: boolean; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open ? <Dialog options={options} preset={preset} lockTarget={lockTarget} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
