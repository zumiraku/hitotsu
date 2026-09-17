"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

type Hit = { id: string; kind: string; title: string; sub: string; href: string };
type Group = { kind: string; label: string; hits: Hit[]; total: number };

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  const flat = groups.flatMap((g) => g.hits);

  const run = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
    if (!value.trim()) {
      setGroups([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abort.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`, { signal: ctrl.signal });
        if (res.ok) {
          const json = (await res.json()) as { groups: Group[] };
          setGroups(json.groups);
          setSel(0);
          setOpen(true);
        }
      } catch {
        // 入力中の打ち切りは無視
      } finally {
        if (abort.current === ctrl) setLoading(false);
      }
    }, 200);
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || !flat.length) {
      if (e.key === "Enter" && q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (s + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) go(`/search?q=${encodeURIComponent(q.trim())}`);
      else go(flat[sel].href);
    }
  };

  let index = 0;
  return (
    <div ref={wrap} className="relative max-w-[560px] flex-1">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
        <Icon name="search" size={16} />
      </span>
      <input
        id="global-search"
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          run(e.target.value);
        }}
        onFocus={() => {
          if (groups.length) setOpen(true);
        }}
        onKeyDown={onKey}
        placeholder="顧客・案件・タスク・メモ・ファイルを検索"
        autoComplete="off"
        aria-label="検索"
        className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-[34px] pr-3 text-[13.5px] focus:border-primary focus:bg-surface focus:outline-none focus:ring-3 focus:ring-primary-soft"
      />
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[70vh] overflow-auto rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_12px_40px_rgba(18,28,40,0.22)]">
          {groups.length === 0 ? (
            <p className="px-2.5 py-3 text-[13px] text-muted">{loading ? "検索中…" : `「${q}」に一致するものはありません`}</p>
          ) : (
            <>
              {groups.map((g) => (
                <div key={g.kind}>
                  <div className="px-2.5 pb-0.5 pt-2 text-[11px] tracking-wider text-muted">
                    {g.label} <span className="font-mono">{g.total}</span>
                  </div>
                  {g.hits.map((h) => {
                    const i = index++;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onMouseEnter={() => setSel(i)}
                        onClick={() => go(h.href)}
                        className={`flex w-full items-baseline gap-2.5 rounded-md px-2.5 py-1.5 text-left ${i === sel ? "bg-surface-2" : ""}`}
                      >
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">{h.title}</span>
                        <span className="max-w-[45%] truncate text-xs text-muted">{h.sub}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="mt-1 w-full rounded-md border-t border-line px-2.5 py-2 text-left text-[12.5px] text-primary hover:bg-surface-2">
                「{q}」の検索結果をすべて見る
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
