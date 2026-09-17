"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { inputBase } from "@/components/ui/field";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";

type Opt = { id: string; name: string };

export function ProjectFilters({ users, customers }: { users: Opt[]; customers: Opt[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const view = params.get("view") === "board" ? "board" : "list";

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

  const hasFilter = !!(params.get("q") || params.get("status") || params.get("owner") || params.get("customer"));
  const segBtn = (on: boolean) => `h-8 px-3 text-[13px] ${on ? "bg-primary-soft font-bold text-primary" : "bg-surface text-ink-2 hover:bg-surface-2"}`;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex overflow-hidden rounded-[7px] border border-line">
        <button type="button" onClick={() => push({ view: "" })} className={segBtn(view === "list")}>一覧</button>
        <button type="button" onClick={() => push({ view: "board" })} className={segBtn(view === "board")}>ボード</button>
      </span>
      <input type="search" value={q} onChange={(e) => onChangeQ(e.target.value)} placeholder="案件名・コード・顧客名・タグで検索" aria-label="検索" className={`${inputBase} min-w-[200px] flex-1`} />
      <select value={params.get("status") ?? ""} onChange={(e) => push({ status: e.target.value })} aria-label="ステータス" className={inputBase}>
        <option value="">すべてのステータス</option>
        <option value="open">進行中・見込み・保留</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
      <select value={params.get("owner") ?? ""} onChange={(e) => push({ owner: e.target.value })} aria-label="担当" className={inputBase}>
        <option value="">すべての担当</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <select value={params.get("customer") ?? ""} onChange={(e) => push({ customer: e.target.value })} aria-label="顧客" className={`${inputBase} max-w-[220px]`}>
        <option value="">すべての顧客</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {hasFilter ? (
        <Link href={view === "board" ? `${pathname}?view=board` : pathname} className="text-[13px] text-primary" onClick={() => setQ("")}>条件をクリア</Link>
      ) : null}
    </div>
  );
}
