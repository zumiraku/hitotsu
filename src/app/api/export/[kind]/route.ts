import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";
import { sessionUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ACTIVITY_LABEL, CUSTOMER_TYPE_LABEL, NOTE_CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { customers: "顧客・取引先", projects: "案件", tasks: "タスク", activities: "対応履歴", notes: "社内メモ" };

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const me = await sessionUser();
  if (!me) return NextResponse.json({ message: "ログインが必要です" }, { status: 401 });
  if (!can(me, "csv.export")) return NextResponse.json({ message: "権限がありません" }, { status: 403 });
  const { kind } = await params;
  if (!LABEL[kind]) return NextResponse.json({ message: "不明な種類です" }, { status: 404 });

  let headers: string[] = [];
  let rows: (string | number | null)[][] = [];
  const un = (u: { name: string } | null) => u?.name ?? "";

  if (kind === "customers") {
    const list = await db.customer.findMany({ where: { deletedAt: null }, include: { owner: { select: { name: true } } }, orderBy: { code: "asc" } });
    headers = ["コード", "会社名", "フリガナ", "種別", "業種", "先方担当者", "役職・部署", "電話", "メール", "住所", "社内担当", "タグ", "社内メモ", "登録日"];
    rows = list.map((c) => [c.code, c.name, c.kana, CUSTOMER_TYPE_LABEL[c.type], c.industry, c.contactName, c.contactTitle, c.tel, c.email, c.address, un(c.owner), c.tags.join("、"), c.note, fmtDate(c.createdAt)]);
  } else if (kind === "projects") {
    const amount = can(me, "amount");
    const list = await db.project.findMany({ where: { deletedAt: null }, include: { customer: { select: { name: true } }, owner: { select: { name: true } }, members: { include: { user: { select: { name: true } } } } }, orderBy: { code: "asc" } });
    headers = ["コード", "案件名", "顧客名", "ステータス", "優先度", "担当者", "メンバー", "開始日", "納期", ...(amount ? ["金額"] : []), "概要", "タグ", "最終更新"];
    rows = list.map((p) => [p.code, p.name, p.customer.name, STATUS_LABEL[p.status], PRIORITY_LABEL[p.priority], un(p.owner), p.members.map((m) => m.user.name).join("、"), fmtDate(p.startDate), fmtDate(p.dueDate), ...(amount ? [p.amount] : []), p.summary, p.tags.join("、"), fmtDateTime(p.updatedAt)]);
  } else if (kind === "tasks") {
    const list = await db.task.findMany({ where: { OR: [{ projectId: null }, { project: { deletedAt: null } }] }, include: { project: { select: { name: true } }, assignee: { select: { name: true } } }, orderBy: [{ done: "asc" }, { dueDate: "asc" }] });
    headers = ["タスク名", "案件名", "担当者", "期限", "完了", "完了日"];
    rows = list.map((t) => [t.title, t.project?.name ?? "", un(t.assignee), t.dueDate ? fmtDate(t.dueDate) : "", t.done ? "完了" : "", t.doneAt ? fmtDate(t.doneAt) : ""]);
  } else if (kind === "activities") {
    const list = await db.activity.findMany({ include: { user: { select: { name: true } }, project: { select: { name: true } }, customer: { select: { name: true } } }, orderBy: { occurredAt: "desc" } });
    headers = ["日時", "種別", "案件名", "顧客名", "記録者", "内容"];
    rows = list.map((a) => [fmtDateTime(a.occurredAt), ACTIVITY_LABEL[a.type], a.project?.name ?? "", a.customer?.name ?? "", un(a.user), a.body]);
  } else {
    const list = await db.note.findMany({ include: { author: { select: { name: true } }, project: { select: { name: true } }, customer: { select: { name: true } } }, orderBy: { updatedAt: "desc" } });
    headers = ["タイトル", "種類", "ピン留め", "案件名", "顧客名", "作成者", "更新日", "本文"];
    rows = list.map((n) => [n.title, NOTE_CATEGORY_LABEL[n.category], n.pinned ? "あり" : "", n.project?.name ?? "", n.customer?.name ?? "", un(n.author), fmtDate(n.updatedAt), n.body]);
  }

  await writeAudit(db, { userId: me.id, action: "EXPORT", targetType: "system", targetLabel: `${LABEL[kind]} ${rows.length}件` });

  const stamp = fmtDate(new Date()).replace(/\//g, "");
  const filename = `${LABEL[kind]}_${stamp}.csv`;
  // Excel で文字化けしないよう BOM を付ける
  return new Response("\uFEFF" + toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
