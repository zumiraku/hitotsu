import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { smartSearch } from "@/lib/ai/smart-search";
import { KIND_LABEL, type SearchKind } from "@/lib/search";

export const metadata = { title: "検索" };
export const dynamic = "force-dynamic";

const KINDS = Object.keys(KIND_LABEL) as SearchKind[];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const kind = KINDS.includes(sp.kind as SearchKind) ? (sp.kind as SearchKind) : undefined;
  const { groups, chips } = q ? await smartSearch(q, { limit: kind ? 100 : 10, kinds: kind ? [kind] : undefined }) : { groups: [], chips: [] };
  const total = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div>
      <PageHeader title="検索結果" sub={q ? `「${q}」　${total}件` : undefined} />
      {!q ? <p className="text-[13px] text-muted">画面上部の検索欄にキーワードを入力してください。顧客・案件・タスク・メモ・ファイル・対応履歴を横断して検索します。</p> : null}
      {chips.length ? <p className="mb-2 text-[12px] text-muted">検索条件：{chips.join("　")}</p> : null}
      {q ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border border-line bg-surface-2 px-3 py-2 text-[12.5px]">
          対象：
          {!kind ? <b>すべて</b> : <Link href={`/search?q=${encodeURIComponent(q)}`}>すべて</Link>}
          {KINDS.map((k) => (
            <span key={k}>{kind === k ? <b>{KIND_LABEL[k]}</b> : <Link href={`/search?q=${encodeURIComponent(q)}&kind=${k}`}>{KIND_LABEL[k]}</Link>}</span>
          ))}
        </div>
      ) : null}
      {q && groups.length === 0 ? (
        <div className="box">
          <div className="box-body text-muted">「{q}」に該当するデータはありません。別のキーワードや社名の一部でお試しください。</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.kind} className="box">
              <div className="box-head">
                <span>
                  {g.label}（{g.total}件）
                </span>
                {!kind && g.total > g.hits.length ? <Link href={`/search?q=${encodeURIComponent(q)}&kind=${g.kind}`} className="text-[12px] font-normal">すべて表示</Link> : null}
              </div>
              <table className="w-full border-collapse text-[13px]">
                <tbody>
                  {g.hits.map((h) => (
                    <tr key={h.id} className="border-b border-line-2 last:border-b-0">
                      <td className="px-3 py-1.5">
                        <Link href={h.href}>{h.title}</Link>
                      </td>
                      <td className="px-3 py-1.5 text-[12px] text-muted">{h.sub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
