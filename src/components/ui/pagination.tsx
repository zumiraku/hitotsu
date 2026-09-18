import Link from "next/link";

type Props = { page: number; pageCount: number; total: number; perPage: number; makeHref: (p: number) => string };

export function Pagination({ page, pageCount, total, perPage, makeHref }: Props) {
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const list = [...pages].sort((a, b) => a - b);
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
      <span>{total ? `全 ${total} 件中 ${from}〜${to} 件を表示` : "0 件"}</span>
      {pageCount > 1 ? (
        <nav className="flex items-center gap-2" aria-label="ページ">
          {page > 1 ? <Link href={makeHref(page - 1)}>« 前へ</Link> : <span className="text-muted">« 前へ</span>}
          {list.map((p, i) => (
            <span key={p} className="flex items-center gap-2">
              {i > 0 && p - list[i - 1] > 1 ? <span className="text-muted">...</span> : null}
              {p === page ? <b>{p}</b> : <Link href={makeHref(p)}>{p}</Link>}
            </span>
          ))}
          {page < pageCount ? <Link href={makeHref(page + 1)}>次へ »</Link> : <span className="text-muted">次へ »</span>}
        </nav>
      ) : null}
    </div>
  );
}
