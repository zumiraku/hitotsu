import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden } from "@/components/forbidden";
import { ImportWizard } from "@/components/import/import-wizard";
import { PageHeader } from "@/components/ui/page-header";
import { IMPORT_FIELDS, IMPORT_LABEL, type ImportKind } from "@/lib/csv";
import { currentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  return { title: `${IMPORT_LABEL[kind as ImportKind] ?? ""}の取り込み` };
}

export default async function ImportPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!IMPORT_LABEL[kind as ImportKind]) notFound();
  const me = await currentUser();
  if (!can(me, "csv.import")) return <Forbidden title="CSV インポート" need="マネージャー以上" />;
  const k = kind as ImportKind;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/data" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink"><span aria-hidden>←</span> データ入出力</Link>
      <PageHeader title={`${IMPORT_LABEL[k]}を CSV から取り込む`} sub={`取り込める項目：${IMPORT_FIELDS[k].map((f) => f.label + (f.required ? "（必須）" : "")).join("、")}`} />
      <ImportWizard kind={k} />
    </div>
  );
}
