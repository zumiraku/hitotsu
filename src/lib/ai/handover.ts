import { db } from "@/lib/db";
import { daysLeft, daysSince, dueLabel, fmtDate, fmtMD } from "@/lib/format";
import { ACTIVITY_LABEL, PRIORITY_LABEL, STATUS_LABEL, isClosed } from "@/lib/labels";
import { complete } from "@/lib/ai/provider";

export type HandoverDraft = { title: string; body: string; source: "rule" | "ai" };

// 案件に紐づく事実を集めて、ルールで引き継ぎメモの骨組みを作る。
// AI が使えるときはこの骨組みを渡して文章だけ整える（事実は足させない）
// 金額はメモに入れない（メモは全員が読めるので、金額の閲覧権限を回避してしまう）
export async function draftHandover(projectId: string, opts: { authorName: string }): Promise<HandoverDraft | null> {
  const p = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      customer: true,
      owner: { select: { name: true } },
      members: { include: { user: { select: { name: true } } } },
      tasks: { where: { done: false }, include: { assignee: { select: { name: true } } }, orderBy: { dueDate: { sort: "asc", nulls: "last" } } },
      activities: { include: { user: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 8 },
      notes: { orderBy: { updatedAt: "desc" }, take: 5 },
      files: { orderBy: { createdAt: "desc" }, take: 5, include: { uploader: { select: { name: true } } } },
    },
  });
  if (!p) return null;

  const c = p.customer;
  const sur = (n: string | undefined | null) => (n ? n.split(/[\s　]/)[0] : "未割当");
  const overdue = p.tasks.filter((t) => t.dueDate && daysLeft(t.dueDate) < 0);
  const last = p.activities[0];
  const L: string[] = [];

  L.push(`【引き継ぎメモ】${p.name}`);
  L.push(`作成日：${fmtDate(new Date())}　作成：${opts.authorName}`);
  L.push("");
  L.push("■ 案件の状況");
  L.push(`・ステータス：${STATUS_LABEL[p.status]}（優先度：${PRIORITY_LABEL[p.priority]}）`);
  L.push(`・納期：${p.dueDate ? `${fmtDate(p.dueDate)}（${dueLabel(p.dueDate)}）` : "未設定"}`);
  L.push(`・お客さま：${c.name}${c.contactName ? `／先方窓口：${c.contactName}${c.contactTitle ? `（${c.contactTitle}）` : ""}` : ""}${c.tel ? `　TEL ${c.tel}` : ""}`);
  L.push(`・担当：${p.owner?.name ?? "未割当"}${p.members.length ? `／メンバー：${p.members.map((m) => m.user.name).join("、")}` : ""}`);
  if (p.summary) L.push(`・概要：${p.summary}`);
  L.push("");
  L.push("■ 直近の対応（新しい順）");
  if (!p.activities.length) L.push("・対応履歴はまだありません");
  p.activities.slice(0, 6).forEach((a) => L.push(`・${fmtMD(a.occurredAt)} ${ACTIVITY_LABEL[a.type]}（${sur(a.user?.name)}）：${a.body}`));
  L.push("");
  L.push("■ 未完了タスク");
  if (!p.tasks.length) L.push("・なし");
  p.tasks.forEach((t) => L.push(`・${t.dueDate ? fmtDate(t.dueDate) : "期限なし"}${t.dueDate && daysLeft(t.dueDate) < 0 ? "【超過】" : ""} ${t.title}（${sur(t.assignee?.name)}）`));
  L.push("");
  L.push("■ 注意点");
  const warns: string[] = [];
  if (overdue.length) warns.push(`期限を過ぎているタスクが${overdue.length}件あります。最優先で対応してください`);
  if (p.status === "HOLD") warns.push("保留中の案件です。再開の条件と時期を先方に確認してください");
  if (last && daysSince(last.occurredAt) >= 14 && !isClosed(p.status)) warns.push(`最後の対応から${daysSince(last.occurredAt)}日経過しています。一度連絡を入れてください`);
  if (p.dueDate && daysLeft(p.dueDate) < 0 && !isClosed(p.status)) warns.push("納期を過ぎています。先方と再設定の合意を取ってください");
  if (c.note) warns.push(`お客さまメモ：${c.note}`);
  p.notes.forEach((n) => warns.push(`社内メモ「${n.title}」も確認してください`));
  if (!warns.length) warns.push("特記事項なし");
  warns.forEach((w) => L.push(`・${w}`));
  L.push("");
  L.push("■ 次にやること");
  if (p.tasks[0]) L.push(`・まず「${p.tasks[0].title}」（${p.tasks[0].dueDate ? fmtDate(p.tasks[0].dueDate) : "期限なし"}）`);
  if (last) L.push(`・直近の対応「${last.body.slice(0, 28)}${last.body.length > 28 ? "…" : ""}」の続きを${c.contactName ? c.contactName + "さん" : "先方"}に確認`);
  if (p.files[0]) L.push(`・最新資料：${p.files[0].name}（v${p.files[0].version}、${sur(p.files[0].uploader?.name)}）`);
  if (!p.tasks[0] && !last && !p.files[0]) L.push("・先方に現状確認の連絡を入れる");

  const rule = L.join("\n");
  const title = `【引き継ぎ】${c.name.replace(/(株式会社|合同会社|有限会社|医療法人)/g, "").trim()}さま ${p.name}`;

  const polished = await complete({
    system:
      "あなたは日本の中小企業の業務管理システムのアシスタントです。渡された引き継ぎメモの骨組みを、後任がそのまま読める自然な日本語の引き継ぎメモに整えてください。" +
      "事実は骨組みにあるものだけを使い、推測で情報を足さないでください。見出し（■）と箇条書きの構成は保ち、冗長な表現を減らし、次にやることは具体的に書いてください。出力はメモ本文のみ。",
    prompt: rule,
    maxTokens: 4000,
    effort: "medium",
  });

  return { title, body: polished ?? rule, source: polished ? "ai" : "rule" };
}
