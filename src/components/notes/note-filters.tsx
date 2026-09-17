"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { inputBase } from "@/components/ui/field";
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

  const seg = (on: boolean) => `h-8 px-3 text-[13px] ${on ? "bg-primary-soft font-bold text-primary" : "bg-surface text-ink-2 hover:bg-surface-2"}`;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input type="search" value={q} onChange={(e) => onChangeQ(e.target.value)} placeholder="タイトル・本文で検索" aria-label="検索" className={`${inputBase} min-w-[220px] flex-1`} />
      <span className="inline-flex overflow-hidden rounded-[7px] border border-line">
        <button type="button" onClick={() => push({ category: "" })} className={seg(!category)}>すべて</button>
        {Object.entries(NOTE_CATEGORY_LABEL).map(([k, l]) => (
          <button key={k} type="button" onClick={() => push({ category: k })} className={seg(category === k)}>{l}</button>
        ))}
      </span>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px]">
        <input type="checkbox" checked={pinned} onChange={(e) => push({ pinned: e.target.checked ? "1" : "" })} className="h-4 w-4 accent-primary" />
        ピン留めのみ
      </label>
      {q || category || pinned ? <Link href={pathname} className="text-[13px] text-primary" onClick={() => setQ("")}>条件をクリア</Link> : null}
    </div>
  );
}
