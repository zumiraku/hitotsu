import { PasswordForm } from "@/components/auth/password-form";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";

export const metadata = { title: "パスワードの変更" };
export const dynamic = "force-dynamic";

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const { first } = await searchParams;
  const me = await currentUser();
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="パスワードの変更" sub={me.email} />
      {first === "1" || me.mustChangePassword ? (
        <p className="mb-3 rounded-[7px] bg-warn-soft px-3 py-2 text-[13px] text-warn">仮パスワードでログインしています。先に自分のパスワードを設定してください</p>
      ) : null}
      <PasswordForm />
    </div>
  );
}
