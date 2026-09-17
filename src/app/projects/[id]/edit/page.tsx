import Link from "next/link";
import { notFound } from "next/navigation";
import { updateProject } from "@/app/projects/actions";
import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/lib/db";
import { toInputDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id }, select: { name: true } });
  return { title: p ? `${p.name} を編集` : "編集" };
}

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, customers, users] = await Promise.all([
    db.project.findFirst({ where: { id, deletedAt: null }, include: { members: { select: { userId: true } } } }),
    db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { kana: "asc" } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/projects/${p.id}`} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <span aria-hidden>←</span> {p.name}
      </Link>
      <PageHeader title="案件を編集" sub={p.code} />
      <ProjectForm
        action={updateProject.bind(null, p.id)}
        customers={customers}
        users={users}
        submitLabel="保存する"
        cancelHref={`/projects/${p.id}`}
        initial={{
          name: p.name,
          customerId: p.customerId,
          status: p.status,
          priority: p.priority,
          ownerId: p.ownerId ?? "",
          memberIds: p.members.map((m) => m.userId).join(","),
          amount: p.amount ? p.amount.toLocaleString("ja-JP") : "",
          startDate: toInputDate(p.startDate),
          dueDate: toInputDate(p.dueDate),
          summary: p.summary ?? "",
          tags: p.tags.join(", "),
        }}
      />
    </div>
  );
}
