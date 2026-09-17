import { db } from "@/lib/db";

// 対応履歴フォームの案件・顧客の選択肢
export async function activityOptions() {
  const [projects, customers] = await Promise.all([
    db.project.findMany({ where: { deletedAt: null, status: { in: ["LEAD", "ACTIVE", "HOLD"] } }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
    db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { kana: "asc" } }),
  ]);
  return { projects, customers };
}
