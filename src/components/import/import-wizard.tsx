"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { importRows, type ImportResult } from "@/actions/import";
import { inputBase, textareaClass } from "@/components/ui/field";
import { IMPORT_FIELDS, IMPORT_LABEL, autoMap, parseCsv, type ImportKind } from "@/lib/csv";

const DEST: Record<ImportKind, string> = { customers: "/customers", projects: "/projects", tasks: "/tasks" };

function Steps({ step }: { step: number }) {
  return (
    <ol className="mb-4 flex flex-wrap gap-1.5 text-xs">
      {["データを貼り付け", "列の対応を確認", "取り込み"].map((l, i) => (
        <li key={l} className={`rounded-full px-2.5 py-0.5 ${step === i + 1 ? "bg-primary-soft font-bold text-primary" : step > i + 1 ? "bg-good-soft text-good" : "bg-surface-3 text-muted"}`}>
          {i + 1}. {l}
        </li>
      ))}
    </ol>
  );
}

// UTF-8 で読めなければ Shift_JIS として読み直す（Excel が出す CSV 対策）
async function readFileText(file: File) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("shift_jis").decode(buf);
  }
}

export function ImportWizard({ kind }: { kind: ImportKind }) {
  const router = useRouter();
  const fields = IMPORT_FIELDS[kind];
  const [text, setText] = useState("");
  const [rows, setRows] = useState<string[][] | null>(null);
  const [map, setMap] = useState<(string | null)[]>([]);
  const [skipErrors, setSkipErrors] = useState(false);
  const [createCustomers, setCreateCustomers] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = rows?.[0] ?? [];
  const data = useMemo(() => rows?.slice(1) ?? [], [rows]);
  const missingRequired = fields.filter((f) => f.required && !map.includes(f.key));
  const step = result?.ok ? 3 : rows ? 2 : 1;

  const preview = () => {
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setResult({ ok: false, message: "見出し行とデータ行が必要です。1行目に項目名を入れてください", issues: [] });
      return;
    }
    setResult(null);
    setRows(parsed);
    setMap(autoMap(kind, parsed[0].map((h) => h.trim())));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await readFileText(file));
  };

  const run = () => {
    const mapped = data.map((r) => {
      const obj: Record<string, string> = {};
      map.forEach((key, i) => {
        if (key) obj[key] = r[i] ?? "";
      });
      return obj;
    });
    start(async () => {
      const res = await importRows(kind, mapped, { skipErrors, createCustomers });
      setResult(res);
      if (res.ok) router.refresh();
    });
  };

  if (result?.ok) {
    return (
      <div className="card">
        <div className="card-body">
          <Steps step={step} />
          <p className="text-[15px] font-bold text-good">{IMPORT_LABEL[kind]}を{result.imported}件取り込みました</p>
          <ul className="mt-2 text-[13px] text-ink-2">
            {result.skipped ? <li>エラーのあった{result.skipped}行はスキップしました</li> : null}
            {result.created?.customers ? <li>見つからなかった顧客を{result.created.customers}件新規作成しました（タグ「CSV取込」付き）</li> : null}
            <li>この取り込みは変更履歴に記録されています</li>
          </ul>
          {result.issues.length ? (
            <details className="mt-3 text-[12.5px]">
              <summary className="cursor-pointer text-muted">スキップした行（{result.issues.length}）</summary>
              <ul className="mt-1 list-disc pl-5 text-bad">
                {result.issues.map((i) => <li key={i.row}>{i.row}行目：{i.message}</li>)}
              </ul>
            </details>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Link href={DEST[kind]} className="btn btn-primary">{IMPORT_LABEL[kind]}の一覧を見る</Link>
            <button type="button" onClick={() => { setRows(null); setText(""); setResult(null); }} className="btn">続けて取り込む</button>
          </div>
        </div>
      </div>
    );
  }

  if (rows) {
    return (
      <div className="card">
        <div className="card-body">
          <Steps step={step} />
          {result?.message ? <p className="mb-3 rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad">{result.message}</p> : null}
          <p className="mb-2 text-[13px] text-muted">見出しから自動で対応づけました。違っていればここで直せます。{missingRequired.length ? <span className="text-bad">「{missingRequired.map((f) => f.label).join("」「")}」は必須です。</span> : null}</p>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="th">CSV の列</th>
                  <th className="th">取り込み先</th>
                  <th className="th">1行目の例</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i}>
                    <td className="td font-bold">{h || <span className="text-muted">（見出しなし）</span>}</td>
                    <td className="td">
                      <select value={map[i] ?? ""} onChange={(e) => setMap((m) => m.map((v, j) => (j === i ? e.target.value || null : v)))} aria-label={`${h} の取り込み先`} className={`${inputBase} h-8`}>
                        <option value="">（取り込まない）</option>
                        {fields.map((f) => (
                          <option key={f.key} value={f.key} disabled={map.includes(f.key) && map[i] !== f.key}>{f.label}{f.required ? " *" : ""}</option>
                        ))}
                      </select>
                      {map[i] && fields.find((f) => f.key === map[i])?.hint ? <div className="mt-0.5 text-[11px] text-muted">{fields.find((f) => f.key === map[i])?.hint}</div> : null}
                    </td>
                    <td className="td max-w-[260px] truncate text-muted">{data[0]?.[i] ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result?.issues.length ? (
            <div className="mt-3 max-h-48 overflow-auto rounded-[7px] bg-bad-soft px-3 py-2 text-[12.5px] text-bad">
              <ul className="list-disc pl-4">
                {result.issues.slice(0, 50).map((i) => <li key={i.row}>{i.row}行目：{i.message}</li>)}
                {result.issues.length > 50 ? <li>…ほか{result.issues.length - 50}行</li> : null}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <span><b>{data.length}件</b>を取り込みます</span>
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} className="h-4 w-4 accent-primary" />
              エラー行を飛ばして取り込む
            </label>
            {kind === "projects" ? (
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={createCustomers} onChange={(e) => setCreateCustomers(e.target.checked)} className="h-4 w-4 accent-primary" />
                見つからない顧客は新規作成する
              </label>
            ) : null}
          </div>
          <div className="mt-4 flex justify-between gap-2">
            <button type="button" onClick={() => { setRows(null); setResult(null); }} className="btn">戻る</button>
            <button type="button" onClick={run} disabled={pending || missingRequired.length > 0} className="btn btn-primary disabled:opacity-60">{pending ? "取り込み中…" : `${data.length}件を取り込む`}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <Steps step={step} />
        {result?.message ? <p className="mb-3 rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad">{result.message}</p> : null}
        <p className="mb-2 text-[13px] text-muted">
          Excel やスプレッドシートで範囲をコピーして貼り付けるか、CSV ファイルを選んでください。1行目は見出しにしてください（列の並びは自由です）。
          <a href={`/api/import-template/${kind}`} className="ml-2 text-primary hover:underline">テンプレートをダウンロード</a>
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])} className="text-[13px] file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-[13px] file:font-bold" />
          <span className="text-xs text-muted">UTF-8 と Shift_JIS のどちらでも読めます</span>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder={fields.map((f) => f.label).join(",")} className={`${textareaClass} font-mono text-[12.5px]`} />
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={preview} disabled={!text.trim()} className="btn btn-primary disabled:opacity-60">プレビュー</button>
        </div>
      </div>
    </div>
  );
}
