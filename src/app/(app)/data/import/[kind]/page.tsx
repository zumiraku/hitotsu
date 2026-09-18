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
  return { title: `${IMPORT_LABEL[kind as ImportKind] ?? ""}のCSV取込` };
}

export default async function ImportPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!IMPORT_LABEL[kind as ImportKind]) notFound();
  const me = await currentUser();
  if (!can(me, "csv.import")) return <Forbidden title="CSV取込" need="マネージャー以上" />;
  const k = kind as ImportKind;
  return (
    <div className="max-w-5xl">
      <p className="mb-1 text-[12px]">
        <Link href="/data">« データ入出力へ戻る</Link>
      </p>
      <PageHeader title={`${IMPORT_LABEL[k]}のCSV取込`} />
      <p className="mb-2 text-[12px] text-muted">取り込める項目：{IMPORT_FIELDS[k].map((f) => f.label + (f.required ? "（必須）" : "")).join("、")}</p>
      <ImportWizard kind={k} />
    </div>
  );
}
