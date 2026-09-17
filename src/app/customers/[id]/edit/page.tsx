import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomer } from "@/app/customers/actions";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.customer.findUnique({ where: { id }, select: { name: true } });
  return { title: c ? `${c.name} を編集` : "編集" };
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, users] = await Promise.all([
    db.customer.findFirst({ where: { id, deletedAt: null } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!c) notFound();

  const action = updateCustomer.bind(null, c.id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/customers/${c.id}`} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <span aria-hidden>←</span> {c.name}
      </Link>
      <PageHeader title="顧客・取引先を編集" sub={c.code} />
      <CustomerForm
        action={action}
        users={users}
        submitLabel="保存する"
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
