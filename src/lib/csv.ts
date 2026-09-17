// CSV の読み書き。ブラウザとサーバーの両方で使うので Node 依存の処理は入れない

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n") + "\r\n";
}

// カンマ区切りとタブ区切り（Excel からの貼り付け）の両方を受け付ける
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = firstLine.includes("\t") && !firstLine.includes(",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export type ImportKind = "customers" | "projects" | "tasks";

export type CsvField = { key: string; label: string; required?: boolean; aliases: string[]; hint?: string };

const norm = (s: string) => s.replace(/[\s　]/g, "").toLowerCase();

export const IMPORT_FIELDS: Record<ImportKind, CsvField[]> = {
  customers: [
    { key: "name", label: "会社名", required: true, aliases: ["会社名", "取引先名", "顧客名", "名称", "社名", "企業名", "name"] },
    { key: "kana", label: "フリガナ", aliases: ["フリガナ", "ふりがな", "カナ", "kana"] },
    { key: "type", label: "種別", aliases: ["種別", "区分", "type"], hint: "顧客／取引先／顧客・取引先" },
    { key: "industry", label: "業種", aliases: ["業種", "industry"] },
    { key: "contactName", label: "先方担当者", aliases: ["先方担当者", "担当者名", "先方担当", "窓口", "ご担当"] },
    { key: "contactTitle", label: "役職・部署", aliases: ["役職", "部署", "役職・部署", "所属"] },
    { key: "tel", label: "電話", aliases: ["電話", "電話番号", "tel", "phone"] },
    { key: "email", label: "メール", aliases: ["メール", "メールアドレス", "email", "e-mail", "mail"] },
    { key: "address", label: "住所", aliases: ["住所", "所在地", "address"] },
    { key: "owner", label: "社内担当", aliases: ["社内担当", "担当", "担当者", "営業担当", "owner"], hint: "ユーザーの名前（姓だけでも可）" },
    { key: "tags", label: "タグ", aliases: ["タグ", "tags"], hint: "カンマまたは読点区切り" },
    { key: "note", label: "社内メモ", aliases: ["メモ", "備考", "社内メモ", "note"] },
  ],
  projects: [
    { key: "name", label: "案件名", required: true, aliases: ["案件名", "プロジェクト名", "件名", "name"] },
    { key: "customer", label: "顧客名", required: true, aliases: ["顧客名", "顧客", "会社名", "取引先", "取引先名", "customer"], hint: "登録済みの会社名。なければ新規作成できます" },
    { key: "status", label: "ステータス", aliases: ["ステータス", "状態", "進捗", "status"], hint: "見込み／進行中／保留／完了／失注" },
    { key: "priority", label: "優先度", aliases: ["優先度", "priority"], hint: "高／中／低" },
    { key: "owner", label: "担当者", aliases: ["担当者", "担当", "社内担当", "owner"] },
    { key: "startDate", label: "開始日", aliases: ["開始日", "開始", "start"] },
    { key: "dueDate", label: "納期", aliases: ["納期", "期限", "締切", "due"] },
    { key: "amount", label: "金額", aliases: ["金額", "受注額", "見積金額", "amount"] },
    { key: "summary", label: "概要", aliases: ["概要", "備考", "メモ", "summary"] },
    { key: "tags", label: "タグ", aliases: ["タグ", "tags"] },
  ],
  tasks: [
    { key: "title", label: "タスク名", required: true, aliases: ["タスク名", "タスク", "件名", "内容", "やること", "title"] },
    { key: "project", label: "案件名", aliases: ["案件名", "案件", "プロジェクト", "project"], hint: "登録済みの案件名" },
    { key: "assignee", label: "担当者", aliases: ["担当者", "担当", "assignee"] },
    { key: "dueDate", label: "期限", aliases: ["期限", "納期", "締切", "due"] },
    { key: "done", label: "完了", aliases: ["完了", "ステータス", "状態", "done"], hint: "完了／済／○ などで完了扱い" },
  ],
};

export const IMPORT_LABEL: Record<ImportKind, string> = { customers: "顧客・取引先", projects: "案件", tasks: "タスク" };

// 見出し名から取り込み先を推測する
export function autoMap(kind: ImportKind, headers: string[]): (string | null)[] {
  const used = new Set<string>();
  return headers.map((h) => {
    const n = norm(h);
    const f = IMPORT_FIELDS[kind].find((x) => !used.has(x.key) && (norm(x.label) === n || x.aliases.some((a) => norm(a) === n)));
    if (f) used.add(f.key);
    return f?.key ?? null;
  });
}

export const IMPORT_TEMPLATE: Record<ImportKind, { headers: string[]; sample: string[][] }> = {
  customers: {
    headers: ["会社名", "フリガナ", "種別", "業種", "先方担当者", "役職・部署", "電話", "メール", "住所", "社内担当", "タグ", "社内メモ"],
    sample: [
      ["株式会社ハルカゼ商会", "ハルカゼショウカイ", "顧客", "小売", "森 由美", "店舗開発部 課長", "06-6000-1234", "mori@harukaze.example", "大阪府大阪市北区梅田1-1-1", "田中", "新規", "展示会で名刺交換"],
      ["ブルーライン工業株式会社", "ブルーラインコウギョウ", "取引先", "製造", "加藤 修", "営業部", "052-700-5678", "kato@blueline.example", "愛知県名古屋市中区栄2-2-2", "鈴木", "部品発注先", ""],
    ],
  },
  projects: {
    headers: ["案件名", "顧客名", "ステータス", "優先度", "担当者", "開始日", "納期", "金額", "概要", "タグ"],
    sample: [
      ["新店舗 販促物一式", "株式会社ハルカゼ商会", "見込み", "中", "田中", "2026/10/01", "2026/11/20", "650000", "11月オープンの新店舗向け", "印刷物"],
    ],
  },
  tasks: {
    headers: ["タスク名", "案件名", "担当者", "期限", "完了"],
    sample: [
      ["新店舗の現地確認", "新店舗 販促物一式", "田中", "2026/10/05", ""],
      ["参考資料の送付", "在庫管理システム刷新", "鈴木", "2026/09/20", "完了"],
    ],
  },
};
