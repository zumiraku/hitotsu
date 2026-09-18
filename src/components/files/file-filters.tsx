"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

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
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-surface-2 px-3 py-2 text-[12.5px]">
      <label>
        キーワード：
        <input type="text" value={q} onChange={(e) => onChangeQ(e.target.value)} placeholder="ファイル名・案件名・顧客名" className="inp w-[220px]" />
      </label>
      <label>
        種類：
        <select value={params.get("kind") ?? ""} onChange={(e) => push({ kind: e.target.value })} className="inp">
          <option value="">すべて</option>
          {kinds.map((k) => (
            <option key={k} value={k}>{k.toUpperCase()}</option>
          ))}
        </select>
      </label>
      <label>
        案件：
        <select value={params.get("project") ?? ""} onChange={(e) => push({ project: e.target.value })} className="inp max-w-[220px]">
          <option value="">すべて</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <label>
        顧客：
        <select value={params.get("customer") ?? ""} onChange={(e) => push({ customer: e.target.value })} className="inp max-w-[220px]">
          <option value="">すべて</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="inline-flex cursor-pointer items-center gap-1">
        <input type="checkbox" checked={params.get("all") === "1"} onChange={(e) => push({ all: e.target.checked ? "1" : "" })} />
        過去の版も表示
      </label>
      {hasFilter ? <Link href={pathname} className="btn btn-sm" onClick={() => setQ("")}>クリア</Link> : null}
    </div>
  );
}
