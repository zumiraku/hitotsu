import Link from "next/link";

export function Pagination({ page, pageCount, makeHref }: { page: number; pageCount: number; makeHref: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const list = [...pages].sort((a, b) => a - b);
  const cls = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line px-2 text-[13px] hover:bg-surface-2";
  return (
    <nav className="flex items-center gap-1" aria-label="ページ">
      {page > 1 ? <Link href={makeHref(page - 1)} className={cls}>前へ</Link> : null}
      {list.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - list[i - 1] > 1 ? <span className="px-1 text-muted">…</span> : null}
          {p === page ? (
            <span className={`${cls} border-primary bg-primary-soft font-bold text-primary`}>{p}</span>
          ) : (
            <Link href={makeHref(p)} className={cls}>{p}</Link>
          )}
        </span>
      ))}
      {page < pageCount ? <Link href={makeHref(page + 1)} className={cls}>次へ</Link> : null}
    </nav>
  );
}
