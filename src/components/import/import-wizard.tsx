"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { importRows, type ImportResult } from "@/actions/import";
import { IMPORT_FIELDS, IMPORT_LABEL, autoMap, parseCsv, type ImportKind } from "@/lib/csv";

const DEST: Record<ImportKind, string> = { customers: "/customers", projects: "/projects", tasks: "/tasks" };
const STEPS = ["データの指定", "列の対応確認", "取込完了"];

function Steps({ step }: { step: number }) {
  return (
    <ol className="mb-3 flex flex-wrap gap-x-1 text-[12px]">
      {STEPS.map((l, i) => (
        <li key={l} className={`border px-2 py-0.5 ${step === i + 1 ? "border-primary bg-primary font-bold text-white" : "border-line bg-surface-2 text-muted"}`}>
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
      setResult({ ok: false, message: "見出し行とデータ行が必要です。1行目に項目名を入れてください。", issues: [] });
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
      <div className="box">
        <div className="box-body">
          <Steps step={step} />
          <p className="msg-ok">{IMPORT_LABEL[kind]}を {result.imported} 件取り込みました。</p>
          <ul className="mt-2 list-disc pl-5 text-[13px]">
            {result.skipped ? <li>エラーのあった {result.skipped} 行はスキップしました。</li> : null}
            {result.created?.customers ? <li>登録のなかった顧客を {result.created.customers} 件新規登録しました。（タグ「CSV取込」を付けています）</li> : null}
            <li>この取込は変更履歴に記録されています。</li>
          </ul>
          {result.issues.length ? (
            <details className="mt-3 text-[12.5px]">
              <summary className="cursor-pointer text-link">スキップした行（{result.issues.length}）</summary>
              <ul className="mt-1 list-disc pl-5 text-bad">
                {result.issues.map((i) => <li key={i.row}>{i.row}行目：{i.message}</li>)}
              </ul>
            </details>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Link href={DEST[kind]} className="btn btn-primary">{IMPORT_LABEL[kind]}一覧へ</Link>
            <button type="button" onClick={() => { setRows(null); setText(""); setResult(null); }} className="btn">続けて取り込む</button>
          </div>
        </div>
      </div>
    );
  }

  if (rows) {
    return (
      <div className="box">
        <div className="box-body">
          <Steps step={step} />
          {result?.message ? <p className="msg-bad mb-3">{result.message}</p> : null}
          <p className="mb-2 text-[12.5px]">
            見出しから取込先を自動で対応づけました。違っている場合はプルダウンで修正してください。
            {missingRequired.length ? <span className="ml-1 text-bad">「{missingRequired.map((f) => f.label).join("」「")}」は必須項目です。</span> : null}
          </p>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="th">CSVの列</th>
                  <th className="th">取込先</th>
                  <th className="th">1行目の例</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i}>
                    <td className="td">{h || <span className="text-muted">（見出しなし）</span>}</td>
                    <td className="td">
                      <select value={map[i] ?? ""} onChange={(e) => setMap((m) => m.map((v, j) => (j === i ? e.target.value || null : v)))} aria-label={`${h} の取込先`} className="inp">
                        <option value="">（取り込まない）</option>
                        {fields.map((f) => (
                          <option key={f.key} value={f.key} disabled={map.includes(f.key) && map[i] !== f.key}>{f.label}{f.required ? "（必須）" : ""}</option>
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
            <div className="msg-bad mt-3 max-h-48 overflow-auto text-[12.5px]">
              <ul className="list-disc pl-4">
                {result.issues.slice(0, 50).map((i) => <li key={i.row}>{i.row}行目：{i.message}</li>)}
                {result.issues.length > 50 ? <li>…ほか {result.issues.length - 50} 行</li> : null}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <span>取込件数：<b>{data.length}</b> 件</span>
            <label className="inline-flex cursor-pointer items-center gap-1">
              <input type="checkbox" checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} />
              エラー行を飛ばして取り込む
            </label>
            {kind === "projects" ? (
              <label className="inline-flex cursor-pointer items-center gap-1">
                <input type="checkbox" checked={createCustomers} onChange={(e) => setCreateCustomers(e.target.checked)} />
                登録のない顧客は新規登録する
              </label>
            ) : null}
          </div>
          <div className="mt-4 flex justify-between gap-2">
            <button type="button" onClick={() => { setRows(null); setResult(null); }} className="btn">戻る</button>
            <button type="button" onClick={run} disabled={pending || missingRequired.length > 0} className="btn btn-primary">{pending ? "取込中..." : "取込実行"}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="box">
      <div className="box-body">
        <Steps step={step} />
        {result?.message ? <p className="msg-bad mb-3">{result.message}</p> : null}
        <p className="mb-2 text-[12.5px]">
          CSVファイルを選択するか、Excel 等で範囲をコピーして下の欄に貼り付けてください。1行目は見出し行にしてください。（列の並びは自由です）
        </p>
        <p className="mb-2 text-[12px]">
          <a href={`/api/import-template/${kind}`}>取込用テンプレート（CSV）をダウンロード</a>
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[12.5px]">
          ファイル：
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])} className="text-[13px]" />
          <span className="text-[11px] text-muted">（UTF-8 / Shift_JIS のどちらでも可）</span>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder={fields.map((f) => f.label).join(",")} className="txt font-mono text-[12.5px]" />
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={preview} disabled={!text.trim()} className="btn btn-primary">プレビュー</button>
        </div>
      </div>
    </div>
  );
}
