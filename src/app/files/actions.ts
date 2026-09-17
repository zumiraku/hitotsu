"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { resolveFileTarget } from "@/lib/files";
import { storage } from "@/lib/storage";

export async function deleteFile(id: string): Promise<{ message?: string }> {
  const me = await currentUser();
  const f = await db.file.findUnique({ where: { id } });
  if (!f) return { message: "このファイルはすでに削除されています" };
  const target = await resolveFileTarget(f.projectId, f.projectId ? null : f.customerId);

  await db.$transaction(async (tx) => {
    await tx.file.delete({ where: { id } });
    if (target) {
      await writeAudit(tx, {
        userId: me.id,
        action: "UPDATE",
        targetType: target.targetType,
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        changes: [{ field: "ファイルを削除", from: `${f.name} v${f.version}`, to: "—" }],
      });
    }
  });
  // 本体の削除に失敗しても記録は消えている。残骸はあとで掃除できるようログだけ出す
  try {
    if (f.storagePath) await storage().delete(f.storagePath);
  } catch (e) {
    console.error("storage delete failed", f.storagePath, e);
  }

  revalidatePath("/files");
  if (f.projectId) revalidatePath(`/projects/${f.projectId}`);
  if (f.customerId) revalidatePath(`/customers/${f.customerId}`);
  return {};
}
