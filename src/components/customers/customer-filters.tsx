"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
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
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-surface-2 px-3 py-2 text-[12.5px]">
      <label>
        キーワード：
        <input type="text" value={q} onChange={(e) => onChangeQ(e.target.value)} placeholder="会社名・フリガナ・担当者・業種・タグ" className="inp w-[240px]" />
      </label>
      <label>
        種別：
        <select value={params.get("type") ?? ""} onChange={(e) => push({ type: e.target.value })} className="inp">
          <option value="">すべて</option>
          {Object.entries(CUSTOMER_TYPE_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        社内担当：
        <select value={params.get("owner") ?? ""} onChange={(e) => push({ owner: e.target.value })} className="inp">
          <option value="">すべて</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </label>
      {hasFilter ? (
        <Link href={pathname} className="btn btn-sm" onClick={() => setQ("")}>クリア</Link>
      ) : null}
    </div>
  );
}
