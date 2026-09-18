import type { Prisma } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { MAX_UPLOAD_BYTES, isBlockedExt, storage, storageKey } from "@/lib/storage";

export const fileInclude = {
  uploader: { select: { name: true } },
  project: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
} as const;

export type SaveResult = { ok: true; id: string; version: number } | { ok: false; message: string };

// 紐づけ先を確認して、監査ログの対象と実際に保存する projectId / customerId を決める
export async function resolveFileTarget(projectId: string | null, customerId: string | null) {
  if (projectId) {
    const p = await db.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true, name: true, customerId: true } });
    if (!p) return null;
    return { targetType: "project", targetId: p.id, targetLabel: p.name, projectId: p.id, customerId: p.customerId };
  }
  if (customerId) {
    const c = await db.customer.findFirst({ where: { id: customerId, deletedAt: null }, select: { id: true, name: true } });
    if (!c) return null;
    return { targetType: "customer", targetId: c.id, targetLabel: c.name, projectId: null, customerId: c.id };
  }
  return null;
}

export async function saveUpload(input: { file: File; projectId: string | null; customerId: string | null; userId: string }): Promise<SaveResult> {
  const name = input.file.name.replace(/[\/:*?"<>|]/g, "_").trim();
  if (!name) return { ok: false, message: "ファイル名が不正です" };
  if (input.file.size === 0) return { ok: false, message: `「${name}」は空のファイルです` };
  if (input.file.size > MAX_UPLOAD_BYTES) return { ok: false, message: `「${name}」は上限（${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB）を超えています` };
  if (isBlockedExt(name)) return { ok: false, message: `「${name}」の形式は受け付けていません` };

  const target = await resolveFileTarget(input.projectId, input.customerId);
  if (!target) return { ok: false, message: "案件または顧客を選んでください" };

  // 同じ場所に同じ名前があれば新しい版として保存する
  const prev = await db.file.findFirst({
    where: { name, projectId: target.projectId, ...(target.projectId ? {} : { customerId: target.customerId }) },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (prev?.version ?? 0) + 1;

  const created = await db.file.create({
    data: {
      name,
      size: input.file.size,
      mimeType: input.file.type || null,
      version,
      storagePath: "",
      projectId: target.projectId,
      customerId: target.customerId,
      uploaderId: input.userId,
    },
  });
  const key = storageKey(created.id, name);
  try {
    await storage().put(key, new Uint8Array(await input.file.arrayBuffer()), input.file.type || undefined);
  } catch (e) {
    await db.file.delete({ where: { id: created.id } });
    throw e;
  }

  await db.$transaction(async (tx) => {
    await tx.file.update({ where: { id: created.id }, data: { storagePath: key } });
    if (target.projectId) await tx.project.update({ where: { id: target.projectId }, data: { updatedAt: new Date() } });
    await writeAudit(tx, {
      userId: input.userId,
      action: "UPDATE",
      targetType: target.targetType,
      targetId: target.targetId,
      targetLabel: target.targetLabel,
      changes: [{ field: version > 1 ? "ファイルを更新" : "ファイルを追加", from: version > 1 ? `v${version - 1}` : "—", to: `${name} v${version}` }],
    });
  });

  return { ok: true, id: created.id, version };
}

export type FileWithRelations = Prisma.FileGetPayload<{ include: typeof fileInclude }>;

// 最新版だけを表に出し、古い版はぶら下げる
export function groupVersions<T extends { name: string; version: number; projectId: string | null; customerId: string | null }>(files: T[]) {
  const map = new Map<string, { latest: T; older: T[] }>();
  for (const f of [...files].sort((a, b) => b.version - a.version)) {
    const key = `${f.projectId ?? ""}|${f.projectId ? "" : (f.customerId ?? "")}|${f.name}`;
    const g = map.get(key);
    if (!g) map.set(key, { latest: f, older: [] });
    else g.older.push(f);
  }
  return [...map.values()];
}
