"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { inputBase } from "@/components/ui/field";
import { CUSTOMER_TYPE_LABEL } from "@/lib/labels";

export function CustomerFilters({ users }: { users: { id: string; name: string }[] }) {
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

  const hasFilter = !!(params.get("q") || params.get("type") || params.get("owner"));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => onChangeQ(e.target.value)}
        placeholder="会社名・フリガナ・担当者・業種・タグで検索"
        aria-label="検索"
        className={`${inputBase} min-w-[220px] flex-1`}
      />
      <select value={params.get("type") ?? ""} onChange={(e) => push({ type: e.target.value })} aria-label="種別" className={inputBase}>
        <option value="">すべての種別</option>
        {Object.entries(CUSTOMER_TYPE_LABEL).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      <select value={params.get("owner") ?? ""} onChange={(e) => push({ owner: e.target.value })} aria-label="社内担当" className={inputBase}>
        <option value="">すべての担当</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      {hasFilter ? (
        <Link href={pathname} className="text-[13px] text-primary" onClick={() => setQ("")}>条件をクリア</Link>
      ) : null}
    </div>
  );
}
