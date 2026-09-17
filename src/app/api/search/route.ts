import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { smartSearch } from "@/lib/ai/smart-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await sessionUser())) return NextResponse.json({ message: "ログインが必要です" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!q) return NextResponse.json({ groups: [] });
  const { groups, chips } = await smartSearch(q, { limit: 4 });
  return NextResponse.json({ groups, chips });
}
