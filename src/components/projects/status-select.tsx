"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { changeProjectStatus } from "@/actions/projects";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";

export function StatusSelect({ id, status }: { id: string; status: ProjectStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onChange = (next: ProjectStatus) => {
    const prev = current;
    setCurrent(next);
    start(async () => {
      const res = await changeProjectStatus(id, next);
      if (res.message) {
        setCurrent(prev);
        setError(res.message);
      } else {
        setError(null);
        router.refresh();
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <select value={current} onChange={(e) => onChange(e.target.value as ProjectStatus)} disabled={pending} aria-label="ステータス" className="inp">
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
      {error ? <span className="text-[12px] text-bad">{error}</span> : null}
    </span>
  );
}
