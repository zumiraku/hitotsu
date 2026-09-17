import Link from "next/link";
import { createProject } from "@/app/projects/actions";
import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { toInputDate } from "@/lib/format";

export const metadata = { title: "案件を追加" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  const [customers, users, me] = await Promise.all([
    db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { kana: "asc" } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    currentUser(),
  ]);
  const preset = customers.find((c) => c.id === customer);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={preset ? `/customers/${preset.id}` : "/projects"} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <span aria-hidden>←</span> {preset ? preset.name : "案件一覧"}
      </Link>
      <PageHeader title="案件を追加" sub="コードは自動で採番されます" />
      <ProjectForm
        action={createProject}
        customers={customers}
        users={users}
        submitLabel="追加する"
        cancelHref={preset ? `/customers/${preset.id}` : "/projects"}
        initial={{ name: "", customerId: preset?.id ?? "", status: "LEAD", priority: "MID", ownerId: me.id, memberIds: "", amount: "", startDate: toInputDate(new Date()), dueDate: "", summary: "", tags: "" }}
      />
    </div>
  );
}
