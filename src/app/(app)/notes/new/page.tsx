import Link from "next/link";
import { createNote } from "@/actions/notes";
import { NoteForm } from "@/components/notes/note-form";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { activityOptions } from "@/lib/activity-options";
import { currentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";

export const metadata = { title: "社内メモの新規登録" };
export const dynamic = "force-dynamic";

export default async function NewNotePage({ searchParams }: { searchParams: Promise<{ project?: string; customer?: string; category?: string }> }) {
  const sp = await searchParams;
  const me = await currentUser();
  if (!can(me, "activity")) return <Forbidden title="社内メモの新規登録" need="一般以上" />;
  const { projects, customers } = await activityOptions();
  const project = projects.find((p) => p.id === sp.project);
  const customer = customers.find((c) => c.id === sp.customer);
  const back = project ? `/projects/${project.id}` : customer ? `/customers/${customer.id}` : "/notes";
  const category = sp.category === "HANDOVER" || sp.category === "RULE" ? sp.category : "MEMO";
  return (
    <div className="max-w-4xl">
      <p className="mb-1 text-[12px]">
        <Link href={back}>« {project?.name ?? customer?.name ?? "社内メモ・引き継ぎ一覧へ戻る"}</Link>
      </p>
      <PageHeader title="社内メモの新規登録" />
      <p className="mb-2 text-[12px] text-muted">※ 「必須」の項目は必ず入力してください。</p>
      <NoteForm
        action={createNote}
        projects={projects}
        customers={customers}
        submitLabel="登録"
        cancelHref={back}
        initial={{ title: category === "HANDOVER" ? "【引き継ぎ】" : "", category, body: "", projectId: project?.id ?? "", customerId: customer?.id ?? "", pinned: false }}
      />
    </div>
  );
}
