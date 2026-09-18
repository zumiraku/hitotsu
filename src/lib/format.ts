const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// DATE 型は UTC 0時で返ってくるので、日付部分だけを取り出して扱う
export function dateOnly(d: Date) {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function fmtDate(d: Date | null | undefined) {
  if (!d) return "－";
  const x = dateOnly(d);
  return `${x.getFullYear()}/${pad(x.getMonth() + 1)}/${pad(x.getDate())}`;
}

export function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "－";
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function daysLeft(due: Date) {
  return Math.round((dateOnly(due).getTime() - startOfToday().getTime()) / DAY);
}

export function dueLabel(due: Date) {
  const n = daysLeft(due);
  if (n < 0) return `${-n}日超過`;
  if (n === 0) return "今日";
  if (n === 1) return "明日";
  return `あと${n}日`;
}

export function ago(d: Date) {
  const n = Math.floor((Date.now() - d.getTime()) / DAY);
  if (n <= 0) return "今日";
  if (n === 1) return "昨日";
  return `${n}日前`;
}

export function yen(n: number) {
  return n.toLocaleString("ja-JP") + "円";
}

export function fileSize(b: number) {
  if (b >= 1_048_576) return (b / 1_048_576).toFixed(1) + " MB";
  if (b >= 1024) return Math.round(b / 1024) + " KB";
  return b + " B";
}

export const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

export function endOfWeek() {
  const d = startOfToday();
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() + (6 - dow));
  return d;
}

export function daysSince(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / DAY);
}

export function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY);
}

// <input type="date"> 用
export function toInputDate(d: Date | null | undefined) {
  if (!d) return "";
  const x = dateOnly(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

// <input type="datetime-local"> 用（ローカル時刻）
export function localNow(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtMD(d: Date) {
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

// 「重要, 重要, 新規」→ ["重要", "新規"]
export function splitTags(s: string) {
  return [...new Set(s.split(/[,、，;]/).map((t) => t.trim()).filter(Boolean))];
}
