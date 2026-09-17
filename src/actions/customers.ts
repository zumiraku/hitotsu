"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { diffChanges, writeAudit } from "@/lib/audit";
import { nextCustomerCode } from "@/lib/codes";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { CUSTOMER_TYPE_LABEL } from "@/lib/labels";
import { parseCustomerForm, type CustomerFieldErrors } from "@/lib/schemas/customer";

export type CustomerFormState = {
  errors?: CustomerFieldErrors;
  message?: string;
  values?: Record<string, string>;
} | null;

async function userName(id: string | null | undefined) {
  if (!id) return "（未割当）";
  const u = await db.user.findUnique({ where: { id }, select: { name: true } });
  return u?.name ?? "（不明）";
}

export async function createCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const me = await currentUser();
  const data = { ...parsed.data, ownerId: parsed.data.ownerId || null };

  const created = await db.$transaction(async (tx) => {
    const code = await nextCustomerCode(tx);
    const c = await tx.customer.create({ data: { ...data, code } });
    await writeAudit(tx, { userId: me.id, action: "CREATE", targetType: "customer", targetId: c.id, targetLabel: c.name });
    return c;
  });

  revalidatePath("/customers");
  redirect(`/customers/${created.id}`);
}

export async function updateCustomer(id: string, _prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.raw };
  const me = await currentUser();
  const before = await db.customer.findFirst({ where: { id, deletedAt: null } });
  if (!before) return { message: "この顧客はすでに削除されています" };

  const data = { ...parsed.data, ownerId: parsed.data.ownerId || null };
  const changes = diffChanges(before, data, [
    ["name", "会社名"],
    ["kana", "フリガナ"],
    ["type", "種別", (v) => CUSTOMER_TYPE_LABEL[v as keyof typeof CUSTOMER_TYPE_LABEL]],
    ["industry", "業種"],
    ["contactName", "先方担当者"],
    ["contactTitle", "役職・部署"],
    ["tel", "電話"],
    ["email", "メール"],
    ["address", "住所"],
    ["tags", "タグ"],
    ["note", "社内メモ"],
  ]);
  if (before.ownerId !== data.ownerId) {
    changes.push({ field: "社内担当", from: await userName(before.ownerId), to: await userName(data.ownerId) });
  }

  await db.$transaction(async (tx) => {
    await tx.customer.update({ where: { id }, data });
    if (changes.length) {
      await writeAudit(tx, { userId: me.id, action: "UPDATE", targetType: "customer", targetId: id, targetLabel: data.name, changes });
    }
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: string): Promise<{ message: string } | undefined> {
  const me = await currentUser();
  const target = await db.customer.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { projects: { where: { deletedAt: null } } } } },
  });
  if (!target) return { message: "この顧客はすでに削除されています" };
  if (target._count.projects > 0) {
    return { message: `案件が${target._count.projects}件あるため削除できません。先に案件を整理してください` };
  }

  await db.$transaction(async (tx) => {
    await tx.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(tx, { userId: me.id, action: "DELETE", targetType: "customer", targetId: id, targetLabel: target.name });
  });

  revalidatePath("/customers");
  redirect("/customers?deleted=1");
}
