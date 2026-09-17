import Link from "next/link";
import { createCustomer } from "@/app/customers/actions";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export const metadata = { title: "顧客・取引先を追加" };
export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const [users, me] = await Promise.all([
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    currentUser(),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/customers" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <span aria-hidden>←</span> 顧客・取引先一覧
      </Link>
      <PageHeader title="顧客・取引先を追加" sub="コードは自動で採番されます" />
      <CustomerForm
        action={createCustomer}
        users={users}
        submitLabel="追加する"
        cancelHref="/customers"
        initial={{ name: "", kana: "", type: "CUSTOMER", industry: "", contactName: "", contactTitle: "", tel: "", email: "", address: "", ownerId: me.id, tags: "", note: "" }}
      />
    </div>
  );
}
