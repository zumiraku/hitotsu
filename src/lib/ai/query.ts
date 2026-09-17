import type { ProjectStatus } from "@/generated/prisma/enums";
import { complete } from "@/lib/ai/provider";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import type { SearchKind } from "@/lib/search";

export type TimeFilter = "overdue" | "today" | "week" | "next" | "month";

export type ParsedQuery = {
  words: string[];
  assignee: { id: string; name: string } | null;
  customer: { id: string; name: string } | null;
  status: ProjectStatus | null;
  time: TimeFilter | null;
  kind: SearchKind | null;
  chips: string[];
};

type Ctx = { users: { id: string; name: string }[]; customers: { id: string; name: string; kana: string | null }[] };

const TIME_WORDS: [RegExp, TimeFilter, string][] = [
  [/期限切れ|期限超過|超過|遅れて|遅れ|過ぎ/, "overdue", "期限超過"],
  [/今日|本日/, "today", "今日"],
  [/今週/, "week", "今週"],
  [/来週/, "next", "来週"],
  [/今月/, "month", "今月"],
];
const KIND_WORDS: [RegExp, SearchKind, string][] = [
  [/タスク|やること|todo|to do/i, "task", "タスク"],
  [/案件|プロジェクト/, "project", "案件"],
  [/取引先|仕入先|外注/, "customer", "顧客・取引先"],
  [/顧客|お客|得意先/, "customer", "顧客・取引先"],
  [/ファイル|資料|見積書|契約書/, "file", "ファイル"],
  [/引き継ぎ|ルール|社内メモ|メモ/, "note", "社内メモ"],
  [/対応履歴|電話した|訪問した|やりとり/, "activity", "対応履歴"],
];
const NOISE = /(さん|くん|氏|様|が担当|担当してる|担当している|担当の|担当|してる|している|ある|一覧|教えて|見せて|出して|検索|探して|期限の|期限|のもの|もの|の|が|を|に|は|で|と|中)/g;
const strip = (s: string) => s.replace(/(株式会社|合同会社|有限会社|医療法人|\s|　)/g, "");

// 「田中さんの今週期限のタスク」のような文を、担当・顧客・ステータス・期限・種類に分解する
export function parseQueryRules(q: string, ctx: Ctx): ParsedQuery {
  let rest = q.replace(/　/g, " ");
  const out: ParsedQuery = { words: [], assignee: null, customer: null, status: null, time: null, kind: null, chips: [] };

  for (const u of ctx.users) {
    const sur = u.name.split(/[\s　]/)[0];
    if (sur.length >= 2 && rest.includes(sur)) {
      out.assignee = { id: u.id, name: u.name };
      rest = rest.split(u.name).join(" ").split(sur).join(" ");
      out.chips.push(`担当：${u.name}`);
      break;
    }
  }
  for (const c of ctx.customers) {
    const short = strip(c.name);
    const hit = (short.length >= 2 && rest.includes(short)) || (c.kana && c.kana.length >= 2 && rest.includes(c.kana));
    if (hit) {
      out.customer = { id: c.id, name: c.name };
      rest = rest.split(c.name).join(" ").split(short).join(" ");
      if (c.kana) rest = rest.split(c.kana).join(" ");
      out.chips.push(`顧客：${short}`);
      break;
    }
  }
  for (const k of STATUS_ORDER) {
    if (rest.includes(STATUS_LABEL[k])) {
      out.status = k;
      rest = rest.split(STATUS_LABEL[k]).join(" ");
      out.chips.push(`ステータス：${STATUS_LABEL[k]}`);
      break;
    }
  }
  for (const [re, key, label] of TIME_WORDS) {
    if (re.test(rest)) {
      out.time = key;
      rest = rest.replace(re, " ");
      out.chips.push(`期限：${label}`);
      break;
    }
  }
  for (const [re, key, label] of KIND_WORDS) {
    const m = rest.match(re);
    if (m) {
      out.kind = key;
      // 「見積書」「契約書」は種類の判定に使いつつ検索語としても残す
      if (!/見積書|契約書/.test(m[0])) rest = rest.replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), " ");
      out.chips.push(`種類：${label}`);
      break;
    }
  }
  if (out.chips.length) rest = rest.replace(NOISE, " ");
  out.words = rest.split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 2 || /^[A-Za-z0-9-]+$/.test(w)).slice(0, 5);
  return out;
}

// 助詞が混じった文なのにルールで何も拾えなかったときだけ AI に聞く
export async function parseQuery(q: string, ctx: Ctx): Promise<ParsedQuery> {
  const rules = parseQueryRules(q, ctx);
  const sentenceLike = /[のがをにはでとさん]/.test(q) && q.length >= 6;
  if (rules.chips.length || !sentenceLike) return rules;

  const text = await complete({
    system:
      "業務管理システムの検索ボックスに入力された日本語を、検索条件の JSON に変換します。" +
      `ユーザー: ${ctx.users.map((u) => u.name).join("、")}。` +
      `顧客: ${ctx.customers.map((c) => c.name).join("、")}。` +
      "出力は次のキーだけを持つ JSON オブジェクトのみ（説明文は不要）: " +
      '{"assignee": ユーザー名または null, "customer": 顧客名または null, "status": "LEAD"|"ACTIVE"|"HOLD"|"DONE"|"LOST"|null, "time": "overdue"|"today"|"week"|"next"|"month"|null, "kind": "task"|"project"|"customer"|"note"|"file"|"activity"|null, "words": 残りの検索語の配列}',
    prompt: q,
    maxTokens: 400,
    effort: "low",
  });
  if (!text) return rules;
  try {
    const json = JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim()) as Partial<{ assignee: string; customer: string; status: string; time: string; kind: string; words: string[] }>;
    const out: ParsedQuery = { ...rules, chips: [] };
    const u = json.assignee ? ctx.users.find((x) => x.name === json.assignee || strip(x.name).includes(strip(json.assignee!))) : null;
    if (u) {
      out.assignee = { id: u.id, name: u.name };
      out.chips.push(`担当：${u.name}`);
    }
    const c = json.customer ? ctx.customers.find((x) => x.name === json.customer || strip(x.name) === strip(json.customer!)) : null;
    if (c) {
      out.customer = { id: c.id, name: c.name };
      out.chips.push(`顧客：${strip(c.name)}`);
    }
    if (json.status && STATUS_ORDER.includes(json.status as ProjectStatus)) {
      out.status = json.status as ProjectStatus;
      out.chips.push(`ステータス：${STATUS_LABEL[out.status]}`);
    }
    const timeLabel: Record<TimeFilter, string> = { overdue: "期限超過", today: "今日", week: "今週", next: "来週", month: "今月" };
    if (json.time && json.time in timeLabel) {
      out.time = json.time as TimeFilter;
      out.chips.push(`期限：${timeLabel[out.time]}`);
    }
    const kinds: SearchKind[] = ["task", "project", "customer", "note", "file", "activity"];
    if (json.kind && kinds.includes(json.kind as SearchKind)) {
      out.kind = json.kind as SearchKind;
      out.chips.push("種類：" + ({ task: "タスク", project: "案件", customer: "顧客・取引先", note: "社内メモ", file: "ファイル", activity: "対応履歴" } as const)[out.kind]);
    }
    if (Array.isArray(json.words)) out.words = json.words.map(String).filter(Boolean).slice(0, 5);
    return out.chips.length ? out : rules;
  } catch {
    return rules;
  }
}
