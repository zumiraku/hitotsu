import Link from "next/link";
import { createCustomer } from "@/actions/customers";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/page-header";
import { Forbidden } from "@/components/forbidden";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export const metadata = { title: "顧客・取引先の新規登録" };
export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const me = await currentUser();
  if (!can(me, "edit")) return <Forbidden title="顧客・取引先の新規登録" need="一般以上" />;
  const users = await db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="max-w-4xl">
      <p className="mb-1 text-[12px]">
        <Link href="/customers">« 顧客・取引先一覧へ戻る</Link>
      </p>
      <PageHeader title="顧客・取引先の新規登録" />
      <p className="mb-2 text-[12px] text-muted">※ 「必須」の項目は必ず入力してください。コードは登録時に自動で採番されます。</p>
      <CustomerForm
        action={createCustomer}
        users={users}
        submitLabel="登録"
        cancelHref="/customers"
        initial={{ name: "", kana: "", type: "CUSTOMER", industry: "", contactName: "", contactTitle: "", tel: "", email: "", address: "", ownerId: me.id, tags: "", note: "" }}
      />
    </div>
  );
}
