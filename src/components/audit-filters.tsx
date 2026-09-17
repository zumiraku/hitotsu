"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ACTION_LABEL, TARGET_LABEL } from "@/components/audit-list";
import { inputBase } from "@/components/ui/field";

export function AuditFilters({ users }: { users: { id: string; name: string }[] }) {
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
  const hasFilter = ["q", "type", "user", "action", "from", "to"].some((k) => params.get(k));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input type="search" value={q} onChange={(e) => onChangeQ(e.target.value)} placeholder="対象の名前で検索" aria-label="検索" className={`${inputBase} min-w-[180px] flex-1`} />
      <select value={params.get("type") ?? ""} onChange={(e) => push({ type: e.target.value })} aria-label="対象" className={inputBase}>
        <option value="">すべての対象</option>
        {Object.entries(TARGET_LABEL).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      <select value={params.get("action") ?? ""} onChange={(e) => push({ action: e.target.value })} aria-label="操作" className={inputBase}>
        <option value="">すべての操作</option>
        {Object.entries(ACTION_LABEL).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      <select value={params.get("user") ?? ""} onChange={(e) => push({ user: e.target.value })} aria-label="ユーザー" className={inputBase}>
        <option value="">すべてのユーザー</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
        <input type="date" value={params.get("from") ?? ""} onChange={(e) => push({ from: e.target.value })} aria-label="開始日" className={`${inputBase} h-8`} />
        〜
        <input type="date" value={params.get("to") ?? ""} onChange={(e) => push({ to: e.target.value })} aria-label="終了日" className={`${inputBase} h-8`} />
      </span>
      {hasFilter ? <Link href={pathname} className="text-[13px] text-primary" onClick={() => setQ("")}>条件をクリア</Link> : null}
    </div>
  );
}
