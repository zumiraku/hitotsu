import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookieStore } from "../setup";

export const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};

// seed のアカウントでログインした状態にする
export async function loginAs(email: string) {
  cookieStore.clear();
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await createSession(user.id);
  return user;
}

export function logoutAll() {
  cookieStore.clear();
}

export const customerId = async (name: string) => (await db.customer.findFirstOrThrow({ where: { name, deletedAt: null } })).id;
export const projectId = async (name: string) => (await db.project.findFirstOrThrow({ where: { name, deletedAt: null } })).id;

export async function lastAudit(targetType: string, targetId?: string) {
  return db.auditLog.findFirst({ where: { targetType, ...(targetId ? { targetId } : {}) }, orderBy: { createdAt: "desc" } });
}

export { RedirectError } from "../setup";
