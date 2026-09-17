import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "hitotsu_session";
const PUBLIC = ["/login", "/api/health"];

// Cookie の有無だけを見る軽い門番。本当の検証は各ページ・Action の currentUser() で行う
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ message: "ログインが必要です" }, { status: 401 });
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
