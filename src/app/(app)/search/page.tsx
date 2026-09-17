import Link from "next/link";
import { Icon } from "@/components/icons";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { KIND_LABEL, searchAll, type SearchKind } from "@/lib/search";

export const metadata = { title: "検索" };
export const dynamic = "force-dynamic";

const KIND_ICON: Record<SearchKind, string> = { customer: "customers", project: "projects", task: "tasks", note: "notes", file: "files", activity: "memo" };
const KINDS = Object.keys(KIND_LABEL) as SearchKind[];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const kind = KINDS.includes(sp.kind as SearchKind) ? (sp.kind as SearchKind) : undefined;
  const groups = q ? await searchAll(q, { limit: kind ? 100 : 10, kinds: kind ? [kind] : undefined }) : [];
  const total = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div>
      <PageHeader title={q ? `「${q}」の検索結果` : "検索"} sub={q ? `${total}件` : "上の検索ボックスから、顧客・案件・タスク・メモ・ファイル・対応履歴を横断して探せます"} />
      {q ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link href={`/search?q=${encodeURIComponent(q)}`} className={`badge ${!kind ? "bg-primary-soft text-primary" : "bg-surface-3 text-ink-2"}`}>すべて</Link>
          {KINDS.map((k) => (
            <Link key={k} href={`/search?q=${encodeURIComponent(q)}&kind=${k}`} className={`badge ${kind === k ? "bg-primary-soft text-primary" : "bg-surface-3 text-ink-2"}`}>{KIND_LABEL[k]}</Link>
          ))}
        </div>
      ) : null}
      {q && groups.length === 0 ? (
        <div className="card"><Empty>「{q}」に一致するものはありません。別の言葉や、社名の一部で試してみてください</Empty></div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.kind} className="card">
              <div className="card-head">
                <h2 className="flex items-center gap-2 text-[15px] font-bold">
                  <Icon name={KIND_ICON[g.kind]} size={16} className="text-muted" />
                  {g.label} <span className="font-mono text-xs font-normal text-muted">{g.total}</span>
                </h2>
                {!kind && g.total > g.hits.length ? <Link href={`/search?q=${encodeURIComponent(q)}&kind=${g.kind}`} className="text-xs text-primary">すべて見る（{g.total}件）</Link> : null}
              </div>
              <ul className="divide-y divide-line">
                {g.hits.map((h) => (
                  <li key={h.id}>
                    <Link href={h.href} className="block px-4 py-2.5 hover:bg-surface-2">
                      <div className="truncate text-[13.5px] font-bold">{h.title}</div>
                      <div className="truncate text-xs text-muted">{h.sub}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
