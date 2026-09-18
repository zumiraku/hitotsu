import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomer } from "@/actions/customers";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/page-header";
import { Forbidden } from "@/components/forbidden";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.customer.findUnique({ where: { id }, select: { name: true } });
  return { title: c ? `${c.name} の編集` : "編集" };
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!can(me, "edit")) return <Forbidden title="顧客・取引先の編集" need="一般以上" />;
  const [c, users] = await Promise.all([
    db.customer.findFirst({ where: { id, deletedAt: null } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!c) notFound();

  const action = updateCustomer.bind(null, c.id);
  return (
    <div className="max-w-4xl">
      <p className="mb-1 text-[12px]">
        <Link href={`/customers/${c.id}`}>« {c.name}</Link>
      </p>
      <PageHeader title="顧客・取引先の編集" sub={c.code} />
      <p className="mb-2 text-[12px] text-muted">※ 「必須」の項目は必ず入力してください。</p>
      <CustomerForm
        action={action}
        users={users}
        submitLabel="更新"
        cancelHref={`/customers/${c.id}`}
        initial={{
          name: c.name,
          kana: c.kana ?? "",
          type: c.type,
          industry: c.industry ?? "",
          contactName: c.contactName ?? "",
          contactTitle: c.contactTitle ?? "",
          tel: c.tel ?? "",
          email: c.email ?? "",
          address: c.address ?? "",
          ownerId: c.ownerId ?? "",
          tags: c.tags.join(", "),
          note: c.note ?? "",
        }}
      />
    </div>
  );
}
