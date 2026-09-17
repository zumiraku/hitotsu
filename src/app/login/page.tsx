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
    <main className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#4c8dc2] to-[#1e5b85] font-display text-[21px] font-bold text-white">ヒ</div>
          <div>
            <div className="font-display text-[20px] font-bold tracking-wider">ヒトツ</div>
            <div className="text-[12px] tracking-wider text-muted">業務を、ひとつに。</div>
          </div>
        </div>
        <LoginForm next={sp.next ?? ""} expired={sp.expired === "1"} samples={samples} />
      </div>
    </main>
  );
}
