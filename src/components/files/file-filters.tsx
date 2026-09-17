"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { inputBase } from "@/components/ui/field";

type Opt = { id: string; name: string };

export function FileFilters({ kinds, projects, customers }: { kinds: string[]; projects: Opt[]; customers: Opt[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  };

  const onChangeQ = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ q: value }), 250);
  };

  const hasFilter = !!(params.get("q") || params.get("kind") || params.get("project") || params.get("customer") || params.get("all"));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input type="search" value={q} onChange={(e) => onChangeQ(e.target.value)} placeholder="ファイル名・案件名・顧客名で検索" aria-label="検索" className={`${inputBase} min-w-[220px] flex-1`} />
      <select value={params.get("kind") ?? ""} onChange={(e) => push({ kind: e.target.value })} aria-label="種類" className={inputBase}>
        <option value="">すべての種類</option>
        {kinds.map((k) => (
          <option key={k} value={k}>{k.toUpperCase()}</option>
        ))}
      </select>
      <select value={params.get("project") ?? ""} onChange={(e) => push({ project: e.target.value })} aria-label="案件" className={`${inputBase} max-w-[220px]`}>
        <option value="">すべての案件</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <select value={params.get("customer") ?? ""} onChange={(e) => push({ customer: e.target.value })} aria-label="顧客" className={`${inputBase} max-w-[220px]`}>
        <option value="">すべての顧客</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px]">
        <input type="checkbox" checked={params.get("all") === "1"} onChange={(e) => push({ all: e.target.checked ? "1" : "" })} className="h-4 w-4 accent-primary" />
        過去の版も表示
      </label>
      {hasFilter ? <Link href={pathname} className="text-[13px] text-primary" onClick={() => setQ("")}>条件をクリア</Link> : null}
    </div>
  );
}
