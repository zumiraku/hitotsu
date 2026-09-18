"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ACTION_LABEL, TARGET_LABEL } from "@/components/audit-list";

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
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-surface-2 px-3 py-2 text-[12.5px]">
      <label>
        対象名：
        <input type="text" value={q} onChange={(e) => onChangeQ(e.target.value)} className="inp w-[180px]" />
      </label>
      <label>
        対象：
        <select value={params.get("type") ?? ""} onChange={(e) => push({ type: e.target.value })} className="inp">
          <option value="">すべて</option>
          {Object.entries(TARGET_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        操作：
        <select value={params.get("action") ?? ""} onChange={(e) => push({ action: e.target.value })} className="inp">
          <option value="">すべて</option>
          {Object.entries(ACTION_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        ユーザー：
        <select value={params.get("user") ?? ""} onChange={(e) => push({ user: e.target.value })} className="inp">
          <option value="">すべて</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </label>
      <span className="inline-flex items-center gap-1">
        期間：
        <input type="date" value={params.get("from") ?? ""} onChange={(e) => push({ from: e.target.value })} aria-label="開始日" className="inp" />
        〜
        <input type="date" value={params.get("to") ?? ""} onChange={(e) => push({ to: e.target.value })} aria-label="終了日" className="inp" />
      </span>
      {hasFilter ? <Link href={pathname} className="btn btn-sm" onClick={() => setQ("")}>クリア</Link> : null}
    </div>
  );
}
