import Link from "next/link";
import { notFound } from "next/navigation";
import { updateNote } from "@/actions/notes";
import { NoteForm } from "@/components/notes/note-form";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { activityOptions } from "@/lib/activity-options";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await db.note.findUnique({ where: { id }, select: { title: true } });
  return { title: n ? `${n.title} を編集` : "編集" };
}

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!can(me, "activity")) return <Forbidden title="メモを編集" need="一般以上" />;
  const [n, { projects, customers }] = await Promise.all([db.note.findUnique({ where: { id } }), activityOptions()]);
  if (!n) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/notes#note-${n.id}`} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <span aria-hidden>←</span> 社内メモ・引き継ぎ
      </Link>
      <PageHeader title="メモを編集" />
      <NoteForm
        action={updateNote.bind(null, n.id)}
        projects={projects}
        customers={customers}
        submitLabel="保存する"
        cancelHref={`/notes#note-${n.id}`}
        initial={{ title: n.title, category: n.category, body: n.body, projectId: n.projectId ?? "", customerId: n.customerId ?? "", pinned: n.pinned }}
      />
    </div>
  );
}
