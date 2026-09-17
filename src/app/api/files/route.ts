import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/current-user";
import { saveUpload } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user: me, denied } = await requirePerm("file");
  if (denied) return NextResponse.json({ ok: false, message: denied }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "ファイルが選ばれていません" }, { status: 400 });

  const projectId = String(form.get("projectId") ?? "") || null;
  const customerId = String(form.get("customerId") ?? "") || null;
  try {
    const res = await saveUpload({ file, projectId, customerId, userId: me.id });
    return NextResponse.json(res, { status: res.ok ? 201 : 400 });
  } catch (e) {
    console.error("upload failed", e);
    return NextResponse.json({ ok: false, message: "保存に失敗しました。時間をおいて再度お試しください" }, { status: 500 });
  }
}
