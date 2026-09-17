"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputBase } from "@/components/ui/field";

type Opt = { id: string; name: string };
const SHOWS: [string, string][] = [
  ["open", "未完了"],
  ["mine", "自分の担当"],
  ["overdue", "期限超過"],
  ["week", "今週"],
  ["all", "すべて"],
];

export function TaskFilters({ users, projects }: { users: Opt[]; projects: Opt[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const show = params.get("show") ?? "open";
  const due = params.get("due");

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next.toString()}`);
  };

  const hasFilter = !!(params.get("assignee") || params.get("project") || due);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex overflow-hidden rounded-[7px] border border-line">
        {SHOWS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => push({ show: k === "open" ? "" : k, due: "" })} className={`h-8 px-3 text-[13px] ${show === k && !due ? "bg-primary-soft font-bold text-primary" : "bg-surface text-ink-2 hover:bg-surface-2"}`}>
            {l}
          </button>
        ))}
      </span>
      {due ? <span className="badge bg-info-soft text-info">期限：{due.replace(/-/g, "/")}</span> : null}
      <select value={params.get("assignee") ?? ""} onChange={(e) => push({ assignee: e.target.value })} aria-label="担当" className={inputBase}>
        <option value="">すべての担当</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <select value={params.get("project") ?? ""} onChange={(e) => push({ project: e.target.value })} aria-label="案件" className={`${inputBase} max-w-[260px]`}>
        <option value="">すべての案件</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {hasFilter ? <Link href={pathname} className="text-[13px] text-primary">条件をクリア</Link> : null}
    </div>
  );
}
