import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { sessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "ログイン" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const sp = await searchParams;
  if (await sessionUser()) redirect("/");

  // 開発環境ではサンプルアカウントを案内する
  const samples = process.env.NODE_ENV !== "production" ? await db.user.findMany({ where: { isActive: true, email: { endsWith: "@example.com" } }, select: { email: true, name: true, role: true }, orderBy: { role: "asc" } }) : [];

  return (
    <main className="flex min-h-full flex-col">
      <div className="bg-primary px-4 py-2.5 text-[15px] font-bold text-white">ヒトツ 業務管理システム</div>
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          <LoginForm next={sp.next ?? ""} expired={sp.expired === "1"} samples={samples} />
        </div>
      </div>
      <footer className="border-t border-line bg-surface px-4 py-2 text-center text-[11px] text-muted">ヒトツ 業務管理システム Ver.{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</footer>
    </main>
  );
}
