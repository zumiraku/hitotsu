"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
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

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-surface-2 px-3 py-2 text-[12.5px]">
      <span className="flex items-center gap-x-3">
        表示：
        <label className="inline-flex cursor-pointer items-center gap-1">
          <input type="radio" name="view" checked={view === "list"} onChange={() => push({ view: "" })} />
          一覧
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1">
          <input type="radio" name="view" checked={view === "board"} onChange={() => push({ view: "board" })} />
          ボード
        </label>
      </span>
      <label>
        キーワード：
        <input type="text" value={q} onChange={(e) => onChangeQ(e.target.value)} placeholder="案件名・コード・顧客名・タグ" className="inp w-[220px]" />
      </label>
      <label>
        ステータス：
        <select value={params.get("status") ?? ""} onChange={(e) => push({ status: e.target.value })} className="inp">
          <option value="">すべて</option>
          <option value="open">見込み・進行中・保留</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </label>
      <label>
        担当：
        <select value={params.get("owner") ?? ""} onChange={(e) => push({ owner: e.target.value })} className="inp">
          <option value="">すべて</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
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
      {hasFilter ? (
        <Link href={view === "board" ? `${pathname}?view=board` : pathname} className="btn btn-sm" onClick={() => setQ("")}>クリア</Link>
      ) : null}
    </div>
  );
}
