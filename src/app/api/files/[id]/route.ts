import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await sessionUser())) return NextResponse.json({ message: "ログインが必要です" }, { status: 401 });
  const { id } = await params;
  const f = await db.file.findUnique({ where: { id } });
  if (!f || !f.storagePath) return NextResponse.json({ message: "ファイルが見つかりません" }, { status: 404 });
  const obj = await storage().get(f.storagePath);
  if (!obj) return NextResponse.json({ message: "ファイル本体が見つかりません" }, { status: 404 });

  const headers = new Headers({
    "Content-Type": f.mimeType || "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    "Cache-Control": "private, no-store",
  });
  if (obj.size) headers.set("Content-Length", String(obj.size));
  return new Response(Readable.toWeb(obj.body) as ReadableStream, { headers });
}
