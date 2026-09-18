import Link from "next/link";
import { createProject } from "@/actions/projects";
import { ProjectForm } from "@/components/projects/project-form";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { toInputDate } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata = { title: "案件の新規登録" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  const me = await currentUser();
  if (!can(me, "edit")) return <Forbidden title="案件の新規登録" need="一般以上" />;
  const [customers, users] = await Promise.all([
    db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { kana: "asc" } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const preset = customers.find((c) => c.id === customer);
  return (
    <div className="max-w-4xl">
      <p className="mb-1 text-[12px]">
        <Link href={preset ? `/customers/${preset.id}` : "/projects"}>« {preset ? preset.name : "案件一覧へ戻る"}</Link>
      </p>
      <PageHeader title="案件の新規登録" />
      <p className="mb-2 text-[12px] text-muted">※ 「必須」の項目は必ず入力してください。コードは登録時に自動で採番されます。</p>
      <ProjectForm
        action={createProject}
        customers={customers}
        users={users}
        submitLabel="登録"
        showAmount={can(me, "amount")}
        cancelHref={preset ? `/customers/${preset.id}` : "/projects"}
        initial={{ name: "", customerId: preset?.id ?? "", status: "LEAD", priority: "MID", ownerId: me.id, memberIds: "", amount: "", startDate: toInputDate(new Date()), dueDate: "", summary: "", tags: "" }}
      />
    </div>
  );
}
