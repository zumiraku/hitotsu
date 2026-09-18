"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Hit = { id: string; kind: string; title: string; sub: string; href: string };
type Group = { kind: string; label: string; hits: Hit[]; total: number };
type Result = { groups: Group[]; chips: string[] };

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const wrap = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  const flat = groups.flatMap((g) => g.hits);

  const run = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
    if (!value.trim()) {
      setGroups([]);
      setChips([]);
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
          const json = (await res.json()) as Result;
          setGroups(json.groups);
          setChips(json.chips ?? []);
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || !flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (s + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter" && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      go(flat[sel].href);
    }
  };

  let index = 0;
  return (
    <form ref={wrap} onSubmit={submit} className="relative flex items-center gap-1">
      <input
        id="global-search"
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          run(e.target.value);
        }}
        onFocus={() => {
          if (groups.length) setOpen(true);
        }}
        onKeyDown={onKey}
        placeholder="キーワード検索"
        autoComplete="off"
        aria-label="検索"
        className="h-[26px] w-full border border-[#999] bg-surface px-1.5 text-[12px] text-ink focus:outline-none md:w-[260px]"
      />
      <button type="submit" className="h-[26px] whitespace-nowrap border border-white/70 px-2 text-[12px] text-white hover:bg-white/10">
        検索
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-30 max-h-[70vh] overflow-auto border border-[#888] bg-surface text-ink md:w-[420px]">
          {chips.length ? <div className="border-b border-line-2 bg-surface-2 px-2 py-1 text-[11px] text-muted">検索条件：{chips.join("　")}</div> : null}
          {groups.length === 0 ? (
            <p className="px-2 py-2 text-[12px] text-muted">{loading ? "検索中..." : `「${q}」に該当するデータはありません。`}</p>
          ) : (
            <>
              {groups.map((g) => (
                <div key={g.kind}>
                  <div className="bg-surface-3 px-2 py-0.5 text-[11px] font-bold">
                    {g.label}（{g.total}）
                  </div>
                  {g.hits.map((h) => {
                    const i = index++;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onMouseEnter={() => setSel(i)}
                        onClick={() => go(h.href)}
                        className={`flex w-full items-baseline gap-2 border-b border-line-2 px-2 py-1 text-left ${i === sel ? "bg-[#f3f7fc]" : ""}`}
                      >
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-link">{h.title}</span>
                        <span className="max-w-[45%] truncate text-[11px] text-muted">{h.sub}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="w-full px-2 py-1.5 text-left text-[12px] text-link hover:bg-surface-2">
                検索結果をすべて表示
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}
