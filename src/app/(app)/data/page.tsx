import Link from "next/link";
import { AuditList } from "@/components/audit-list";
import { Forbidden } from "@/components/forbidden";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/page-header";
import { IMPORT_LABEL, type ImportKind } from "@/lib/csv";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export const metadata = { title: "データ入出力" };
export const dynamic = "force-dynamic";

const EXPORTS: [string, string, string][] = [
  ["customers", "顧客・取引先", "会社名・種別・先方担当・社内担当・タグ・社内メモ"],
  ["projects", "案件", "顧客名・ステータス・担当・納期・金額・概要"],
  ["tasks", "タスク", "案件名・担当・期限・完了"],
  ["activities", "対応履歴", "日時・種別・案件／顧客・内容"],
  ["notes", "社内メモ", "種類・関連・本文"],
];
const IMPORT_DESC: Record<ImportKind, string> = {
  customers: "会社名・種別・業種・先方担当者・社内担当・タグ など",
  projects: "案件名・顧客名・ステータス・担当者・納期・金額 など",
  tasks: "タスク名・案件名・担当者・期限 など",
};

export default async function DataPage() {
  const me = await currentUser();
  if (!can(me, "csv.export")) return <Forbidden title="データ入出力" need="一般以上" />;
  const [counts, logs] = await Promise.all([
    Promise.all([
      db.customer.count({ where: { deletedAt: null } }),
      db.project.count({ where: { deletedAt: null } }),
      db.task.count({ where: { OR: [{ projectId: null }, { project: { deletedAt: null } }] } }),
      db.activity.count(),
      db.note.count(),
    ]),
    db.auditLog.findMany({ where: { action: { in: ["IMPORT", "EXPORT"] } }, include: { user: { select: { name: true, color: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div>
      <PageHeader title="データ入出力" sub="今の Excel・スプレッドシートからの移行も、いつでも取り出すのもここから" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head">
            <h2 className="text-[15px] font-bold">CSV エクスポート</h2>
            <Icon name="download" size={18} className="text-muted" />
          </div>
          <div className="card-body">
            <p className="mb-3 text-[13px] text-muted">UTF-8（BOM 付き）で出力します。Excel でそのまま開けます。{can(me, "amount") ? "" : "金額の列は権限により含まれません。"}</p>
            <ul className="divide-y divide-line">
              {EXPORTS.map(([k, l, d], i) => (
                <li key={k} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{l} <span className="ml-1 font-mono text-xs font-normal text-muted">{counts[i]}件</span></div>
                    <div className="truncate text-xs text-muted">{d}</div>
                  </div>
                  <a href={`/api/export/${k}`} className="btn h-8 px-3 text-[12.5px]">
                    <Icon name="download" size={14} />出力
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="text-[15px] font-bold">CSV インポート</h2>
            <Icon name="upload" size={18} className="text-muted" />
          </div>
          <div className="card-body">
            {can(me, "csv.import") ? (
              <>
                <p className="mb-3 text-[13px] text-muted">列の並びは自由です。見出し名から自動で対応づけて、取り込む前にプレビューで確認できます。Excel からコピーした表をそのまま貼り付けても読めます。</p>
                <ul className="divide-y divide-line">
                  {(Object.keys(IMPORT_LABEL) as ImportKind[]).map((k) => (
                    <li key={k} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{IMPORT_LABEL[k]}</div>
                        <div className="truncate text-xs text-muted">{IMPORT_DESC[k]}</div>
                      </div>
                      <Link href={`/data/import/${k}`} className="btn h-8 px-3 text-[12.5px]">
                        <Icon name="upload" size={14} />取り込む
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] text-muted">おすすめの順番：顧客・取引先 → 案件 → タスク（案件は顧客名で、タスクは案件名で紐づけます）</p>
              </>
            ) : (
              <p className="flex items-center gap-2 text-[13px] text-muted"><Icon name="lock" size={14} />CSV インポートには「マネージャー」以上の権限が必要です</p>
            )}
          </div>
        </section>
      </div>

      <section className="card mt-4">
        <div className="card-head"><h2 className="text-[15px] font-bold">最近の入出力</h2></div>
        <div className="card-body"><AuditList items={logs} /></div>
      </section>
    </div>
  );
}
