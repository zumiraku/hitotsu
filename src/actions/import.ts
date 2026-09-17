"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { nextCustomerCode, nextProjectCode } from "@/lib/codes";
import { IMPORT_LABEL, type ImportKind } from "@/lib/csv";
import { requirePerm } from "@/lib/current-user";
import { db } from "@/lib/db";
import { CUSTOMER_TYPE_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { customerSchema } from "@/lib/schemas/customer";
import { normalizeAmount } from "@/lib/schemas/project";

export type ImportRow = Record<string, string>;
export type RowIssue = { row: number; message: string };
export type ImportResult = { ok: boolean; message?: string; imported?: number; skipped?: number; created?: { customers: number }; issues: RowIssue[] };

const MAX_ROWS = 2000;

// "2026/9/5" "2026-09-05" "9/5" などを DATE 用の UTC 日付に
function parseDate(s: string): Date | null | "invalid" {
  const t = s.trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  m = t.match(/^(\d{1,2})[\/\-月](\d{1,2})/);
  if (m) return new Date(Date.UTC(new Date().getFullYear(), Number(m[1]) - 1, Number(m[2])));
  return "invalid";
}

function byLabel<T extends string>(labels: Record<T, string>, s: string): T | null {
  const t = s.trim();
  if (!t) return null;
  const hit = (Object.entries(labels) as [T, string][]).find(([k, l]) => l === t || k === t.toUpperCase());
  return hit ? hit[0] : null;
}

const splitTags = (s: string) => s.split(/[,、，;]/).map((x) => x.trim()).filter(Boolean);

export async function importRows(kind: ImportKind, rows: ImportRow[], options: { skipErrors?: boolean; createCustomers?: boolean } = {}): Promise<ImportResult> {
  const { user: me, denied } = await requirePerm("csv.import");
  if (denied) return { ok: false, message: denied, issues: [] };
  if (!IMPORT_LABEL[kind]) return { ok: false, message: "不明な種類です", issues: [] };
  if (!rows.length) return { ok: false, message: "取り込む行がありません", issues: [] };
  if (rows.length > MAX_ROWS) return { ok: false, message: `一度に取り込めるのは${MAX_ROWS}行までです`, issues: [] };

  const users = await db.user.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const findUser = (s: string) => {
    const t = s.replace(/[\s　]/g, "");
    if (!t) return null;
    return users.find((u) => u.name.replace(/[\s　]/g, "") === t) ?? users.find((u) => u.name.split(/[\s　]/)[0] === t) ?? users.find((u) => u.name.replace(/[\s　]/g, "").includes(t)) ?? null;
  };
  const customers = await db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true, kana: true } });
  const strip = (s: string) => s.replace(/(株式会社|合同会社|有限会社|医療法人|\s|　)/g, "");
  const findCustomer = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    return customers.find((c) => c.name === t) ?? customers.find((c) => strip(c.name) === strip(t)) ?? customers.find((c) => c.kana && c.kana === t) ?? null;
  };

  const issues: RowIssue[] = [];
  const valid: { row: number; data: Record<string, unknown> }[] = [];

  rows.forEach((r, i) => {
    const row = i + 2; // 1行目は見出し
    const get = (k: string) => (r[k] ?? "").trim();
    if (kind === "customers") {
      const type = get("type") ? byLabel(CUSTOMER_TYPE_LABEL, get("type")) : "CUSTOMER";
      if (!type) return issues.push({ row, message: `種別「${get("type")}」は 顧客／取引先／顧客・取引先 のいずれかにしてください` });
      const owner = get("owner") ? findUser(get("owner")) : null;
      if (get("owner") && !owner) return issues.push({ row, message: `社内担当「${get("owner")}」に一致するユーザーがいません` });
      const parsed = customerSchema.safeParse({ name: get("name"), kana: get("kana"), type, industry: get("industry"), contactName: get("contactName"), contactTitle: get("contactTitle"), tel: get("tel"), email: get("email"), address: get("address"), ownerId: owner?.id ?? "", tags: get("tags"), note: get("note") });
      if (!parsed.success) return issues.push({ row, message: parsed.error.issues.map((x) => x.message).join("、") });
      if (customers.some((c) => c.name === parsed.data.name)) return issues.push({ row, message: `「${parsed.data.name}」はすでに登録されています` });
      valid.push({ row, data: { ...parsed.data, ownerId: owner?.id ?? null } });
    } else if (kind === "projects") {
      const name = get("name");
      if (!name) return issues.push({ row, message: "案件名がありません" });
      if (name.length > 120) return issues.push({ row, message: "案件名は120文字以内にしてください" });
      const customerName = get("customer");
      if (!customerName) return issues.push({ row, message: "顧客名がありません" });
      const customer = findCustomer(customerName);
      if (!customer && !options.createCustomers) return issues.push({ row, message: `顧客「${customerName}」が登録されていません（「見つからない顧客は新規作成」にチェックすると作成できます）` });
      const status = get("status") ? byLabel(STATUS_LABEL, get("status")) : "LEAD";
      if (!status) return issues.push({ row, message: `ステータス「${get("status")}」は 見込み／進行中／保留／完了／失注 のいずれかにしてください` });
      const priority = get("priority") ? byLabel(PRIORITY_LABEL, get("priority")) : "MID";
      if (!priority) return issues.push({ row, message: `優先度「${get("priority")}」は 高／中／低 のいずれかにしてください` });
      const owner = get("owner") ? findUser(get("owner")) : null;
      if (get("owner") && !owner) return issues.push({ row, message: `担当者「${get("owner")}」に一致するユーザーがいません` });
      const startDate = parseDate(get("startDate"));
      if (startDate === "invalid") return issues.push({ row, message: `開始日「${get("startDate")}」の形式が正しくありません` });
      const dueDate = parseDate(get("dueDate"));
      if (dueDate === "invalid") return issues.push({ row, message: `納期「${get("dueDate")}」の形式が正しくありません` });
      const amountStr = normalizeAmount(get("amount"));
      if (amountStr && !/^\d{1,10}$/.test(amountStr)) return issues.push({ row, message: `金額「${get("amount")}」は数字で入力してください` });
      valid.push({ row, data: { name, customerId: customer?.id ?? null, customerName, status, priority, ownerId: owner?.id ?? null, startDate, dueDate, amount: amountStr ? Number(amountStr) : 0, summary: get("summary").slice(0, 4000), tags: splitTags(get("tags")).slice(0, 10) } });
    } else {
      const title = get("title");
      if (!title) return issues.push({ row, message: "タスク名がありません" });
      if (title.length > 200) return issues.push({ row, message: "タスク名は200文字以内にしてください" });
      const owner = get("assignee") ? findUser(get("assignee")) : null;
      if (get("assignee") && !owner) return issues.push({ row, message: `担当者「${get("assignee")}」に一致するユーザーがいません` });
      const dueDate = parseDate(get("dueDate"));
      if (dueDate === "invalid") return issues.push({ row, message: `期限「${get("dueDate")}」の形式が正しくありません` });
      valid.push({ row, data: { title, projectName: get("project"), assigneeId: owner?.id ?? null, dueDate, done: /^(完了|済|done|true|1|○|〇|✓)$/i.test(get("done")) } });
    }
  });

  if (issues.length && !options.skipErrors) return { ok: false, message: `${issues.length}行にエラーがあります。直すか「エラー行を飛ばして取り込む」にチェックしてください`, issues };
  if (!valid.length) return { ok: false, message: "取り込める行がありません", issues };

  let createdCustomers = 0;
  const projectsForTasks = kind === "tasks" ? await db.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }) : [];

  await db.$transaction(
    async (tx) => {
      if (kind === "customers") {
        for (const v of valid) {
          const code = await nextCustomerCode(tx);
          await tx.customer.create({ data: { ...(v.data as Prisma.CustomerUncheckedCreateInput), code } });
        }
      } else if (kind === "projects") {
        const created = new Map<string, string>();
        for (const v of valid) {
          const d = v.data as { name: string; customerId: string | null; customerName: string; status: "LEAD"; priority: "MID"; ownerId: string | null; startDate: Date | null; dueDate: Date | null; amount: number; summary: string; tags: string[] };
          let customerId = d.customerId ?? created.get(strip(d.customerName)) ?? null;
          if (!customerId) {
            const code = await nextCustomerCode(tx);
            const c = await tx.customer.create({ data: { code, name: d.customerName, tags: ["CSV取込"], ownerId: d.ownerId } });
            created.set(strip(d.customerName), c.id);
            customerId = c.id;
            createdCustomers++;
          }
          const code = await nextProjectCode(tx);
          await tx.project.create({ data: { code, name: d.name, customerId, status: d.status, priority: d.priority, ownerId: d.ownerId, startDate: d.startDate, dueDate: d.dueDate, amount: d.amount, summary: d.summary || null, tags: d.tags } });
        }
      } else {
        for (const v of valid) {
          const d = v.data as { title: string; projectName: string; assigneeId: string | null; dueDate: Date | null; done: boolean };
          const p = d.projectName ? (projectsForTasks.find((x) => x.name === d.projectName) ?? projectsForTasks.find((x) => x.name.includes(d.projectName) || d.projectName.includes(x.name)) ?? null) : null;
          await tx.task.create({ data: { title: d.title, projectId: p?.id ?? null, assigneeId: d.assigneeId, createdById: me.id, dueDate: d.dueDate, done: d.done, doneAt: d.done ? new Date() : null } });
        }
      }
      await writeAudit(tx, {
        userId: me.id,
        action: "IMPORT",
        targetType: "system",
        targetLabel: `${IMPORT_LABEL[kind]} ${valid.length}件`,
        changes: [
          { field: "件数", from: "—", to: `${valid.length}件${issues.length ? `（${issues.length}行をスキップ）` : ""}` },
          ...(createdCustomers ? [{ field: "新規作成した顧客", from: "—", to: `${createdCustomers}件` }] : []),
        ],
      });
    },
    { timeout: 60_000 },
  );

  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/projects");
  revalidatePath("/tasks");
  return { ok: true, imported: valid.length, skipped: issues.length, created: { customers: createdCustomers }, issues };
}
