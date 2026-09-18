import { PasswordForm } from "@/components/auth/password-form";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";

export const metadata = { title: "パスワードの変更" };
export const dynamic = "force-dynamic";

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const { first } = await searchParams;
  const me = await currentUser();
  return (
    <div className="max-w-xl">
      <PageHeader title="パスワードの変更" sub={`ログインID：${me.loginId}`} />
      {first === "1" || me.mustChangePassword ? <p className="msg-warn mb-3">仮パスワードでログインしています。先にご自身のパスワードを設定してください。</p> : null}
      <PasswordForm />
    </div>
  );
}
