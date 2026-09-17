import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export type Change = { field: string; from: string; to: string };

type FieldSpec<T> = [key: keyof T & string, label: string, format?: (v: unknown) => string];

const show = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "（空）";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "（空）";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
};

export function diffChanges<T extends object>(before: T, after: Partial<T>, fields: FieldSpec<T>[]): Change[] {
  const out: Change[] = [];
  for (const [key, label, format] of fields) {
    if (!(key in after)) continue;
    const f = format ?? show;
    const a = f(before[key]);
    const b = f(after[key]);
    if (a !== b) out.push({ field: label, from: a, to: b });
  }
  return out;
}

type Db = Prisma.TransactionClient | typeof db;

export function writeAudit(
  tx: Db,
  input: { userId: string; action: AuditAction; targetType: string; targetId?: string | null; targetLabel: string; changes?: Change[] },
) {
  return tx.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel,
      changes: input.changes?.length ? input.changes : undefined,
    },
  });
}
