"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-surface-2 px-3 py-2 text-[12.5px]">
      <span className="flex flex-wrap items-center gap-x-3">
        表示：
        {SHOWS.map(([k, l]) => (
          <label key={k} className="inline-flex cursor-pointer items-center gap-1">
            <input type="radio" name="show" checked={show === k && !due} onChange={() => push({ show: k === "open" ? "" : k, due: "" })} />
            {l}
          </label>
        ))}
      </span>
      {due ? <span>期限：{due.replace(/-/g, "/")}</span> : null}
      <label>
        担当：
        <select value={params.get("assignee") ?? ""} onChange={(e) => push({ assignee: e.target.value })} className="inp">
          <option value="">すべて</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </label>
      <label>
        案件：
        <select value={params.get("project") ?? ""} onChange={(e) => push({ project: e.target.value })} className="inp max-w-[260px]">
          <option value="">すべて</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      {hasFilter ? <Link href={pathname} className="btn btn-sm">クリア</Link> : null}
    </div>
  );
}
