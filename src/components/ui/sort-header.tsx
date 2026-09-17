import Link from "next/link";

type Props = { label: string; field: string; sort: string; dir: "asc" | "desc"; makeHref: (params: Record<string, string>) => string; className?: string };

export function SortHeader({ label, field, sort, dir, makeHref, className = "" }: Props) {
  const active = sort === field;
  const nextDir = active && dir === "asc" ? "desc" : "asc";
  return (
    <th className={`th ${className}`}>
      <Link href={makeHref({ sort: field, dir: nextDir })} className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}>
        {label}
        {active ? <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span> : null}
      </Link>
    </th>
  );
}
