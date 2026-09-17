import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { IMPORT_LABEL, IMPORT_TEMPLATE, toCsv, type ImportKind } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (!(await sessionUser())) return NextResponse.json({ message: "ログインが必要です" }, { status: 401 });
  const { kind } = await params;
  const t = IMPORT_TEMPLATE[kind as ImportKind];
  if (!t) return NextResponse.json({ message: "不明な種類です" }, { status: 404 });
  return new Response("\uFEFF" + toCsv(t.headers, t.sample), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`取込テンプレート_${IMPORT_LABEL[kind as ImportKind]}.csv`)}`,
    },
  });
}
