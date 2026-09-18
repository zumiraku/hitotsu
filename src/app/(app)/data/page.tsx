import Link from "next/link";
import { AuditList } from "@/components/audit-list";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { IMPORT_LABEL, type ImportKind } from "@/lib/csv";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { liveProject, liveRefs } from "@/lib/scope";

export const metadata = { title: "データ入出力" };
export const dynamic = "force-dynamic";

const EXPORTS: [string, string, string][] = [
  ["customers", "顧客・取引先", "会社名、種別、先方担当者、社内担当、タグ、社内メモ"],
  ["projects", "案件", "顧客名、ステータス、担当、納期、金額、概要"],
  ["tasks", "タスク", "案件名、担当、期限、完了"],
  ["activities", "対応履歴", "日時、種別、案件／顧客、内容"],
  ["notes", "社内メモ", "種類、関連、本文"],
];
const IMPORT_DESC: Record<ImportKind, string> = {
  customers: "会社名、種別、業種、先方担当者、社内担当、タグ など",
  projects: "案件名、顧客名、ステータス、担当者、納期、金額 など",
  tasks: "タスク名、案件名、担当者、期限 など",
};

export default async function DataPage() {
  const me = await currentUser();
  if (!can(me, "csv.export")) return <Forbidden title="データ入出力" need="一般以上" />;
  const [counts, logs] = await Promise.all([
    Promise.all([
      db.customer.count({ where: { deletedAt: null } }),
      db.project.count({ where: { deletedAt: null } }),
      db.task.count({ where: liveProject }),
      db.activity.count({ where: liveRefs }),
      db.note.count({ where: liveRefs }),
    ]),
    db.auditLog.findMany({ where: { action: { in: ["IMPORT", "EXPORT"] } }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div>
      <PageHeader title="データ入出力" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="box">
          <div className="box-head">CSV出力</div>
          <div className="box-body">
            <p className="mb-2 text-[12px] text-muted">※ UTF-8（BOM付き）で出力します。Excel でそのまま開けます。{can(me, "amount") ? "" : "金額の列は権限により含まれません。"}</p>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="th">データ</th>
                  <th className="th">主な項目</th>
                  <th className="th text-right">件数</th>
                  <th className="th w-16"></th>
                </tr>
              </thead>
              <tbody>
                {EXPORTS.map(([k, l, d], i) => (
                  <tr key={k}>
                    <td className="td whitespace-nowrap">{l}</td>
                    <td className="td text-[12px] text-ink-2">{d}</td>
                    <td className="td tnum text-right">{counts[i]}</td>
                    <td className="td text-center">
                      <a href={`/api/export/${k}`} className="btn btn-sm">出力</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="box">
          <div className="box-head">CSV取込</div>
          <div className="box-body">
            {can(me, "csv.import") ? (
              <>
                <p className="mb-2 text-[12px] text-muted">※ 列の並びは自由です。見出し名から取込先を自動で対応づけ、取込前にプレビューで確認できます。Excel からコピーした表の貼り付けにも対応しています。</p>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="th">データ</th>
                      <th className="th">取り込める項目</th>
                      <th className="th w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(IMPORT_LABEL) as ImportKind[]).map((k) => (
                      <tr key={k}>
                        <td className="td whitespace-nowrap">{IMPORT_LABEL[k]}</td>
                        <td className="td text-[12px] text-ink-2">{IMPORT_DESC[k]}</td>
                        <td className="td text-center">
                          <Link href={`/data/import/${k}`} className="btn btn-sm">取込</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[12px] text-muted">※ 取込の順番は「顧客・取引先 → 案件 → タスク」を推奨します。（案件は顧客名で、タスクは案件名で紐づけます）</p>
              </>
            ) : (
              <p className="text-[13px] text-muted">CSV取込には「マネージャー」以上の権限が必要です。</p>
            )}
          </div>
        </div>
      </div>

      <div className="box mt-4">
        <div className="box-head">最近の入出力履歴</div>
        <div className="box-body">
          <AuditList items={logs} />
        </div>
      </div>
    </div>
  );
}
