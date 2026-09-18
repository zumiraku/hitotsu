"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { NOTE_CATEGORY_LABEL } from "@/lib/labels";

export function NoteFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const category = params.get("category") ?? "";
  const pinned = params.get("pinned") === "1";

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("created");
    next.delete("saved");
    router.replace(`${pathname}?${next.toString()}`);
  };

  const onChangeQ = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ q: value }), 250);
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-surface-2 px-3 py-2 text-[12.5px]">
      <label>
        キーワード：
        <input type="text" value={q} onChange={(e) => onChangeQ(e.target.value)} placeholder="タイトル・本文" className="inp w-[220px]" />
      </label>
      <label>
        種類：
        <select value={category} onChange={(e) => push({ category: e.target.value })} className="inp">
          <option value="">すべて</option>
          {Object.entries(NOTE_CATEGORY_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label className="inline-flex cursor-pointer items-center gap-1">
        <input type="checkbox" checked={pinned} onChange={(e) => push({ pinned: e.target.checked ? "1" : "" })} />
        ピン留めのみ
      </label>
      {q || category || pinned ? <Link href={pathname} className="btn btn-sm" onClick={() => setQ("")}>クリア</Link> : null}
    </div>
  );
}
