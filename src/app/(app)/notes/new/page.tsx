import Link from "next/link";
import { createNote } from "@/actions/notes";
import { NoteForm } from "@/components/notes/note-form";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { activityOptions } from "@/lib/activity-options";
import { currentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";

export const metadata = { title: "メモを追加" };
export const dynamic = "force-dynamic";

export default async function NewNotePage({ searchParams }: { searchParams: Promise<{ project?: string; customer?: string; category?: string }> }) {
  const sp = await searchParams;
  const me = await currentUser();
  if (!can(me, "activity")) return <Forbidden title="メモを追加" need="一般以上" />;
  const { projects, customers } = await activityOptions();
  const project = projects.find((p) => p.id === sp.project);
  const customer = customers.find((c) => c.id === sp.customer);
  const back = project ? `/projects/${project.id}` : customer ? `/customers/${customer.id}` : "/notes";
  const category = sp.category === "HANDOVER" || sp.category === "RULE" ? sp.category : "MEMO";
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={back} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <span aria-hidden>←</span> {project?.name ?? customer?.name ?? "社内メモ・引き継ぎ"}
      </Link>
      <PageHeader title="メモを追加" />
      <NoteForm
        action={createNote}
        projects={projects}
        customers={customers}
        submitLabel="追加する"
        cancelHref={back}
        initial={{ title: category === "HANDOVER" ? "【引き継ぎ】" : "", category, body: "", projectId: project?.id ?? "", customerId: customer?.id ?? "", pinned: false }}
      />
    </div>
  );
}
