"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { changeProjectStatus } from "@/actions/projects";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { STATUS_CLASS, STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";

export type BoardCard = {
  id: string;
  name: string;
  status: ProjectStatus;
  customerName: string;
  owner: { name: string; color: string } | null;
  dueLabel: string | null;
  overdue: boolean;
  openTasks: number;
  alertCount: number;
  alertLevel: "bad" | "warn" | null;
};

export function Board({ cards: initial, canDrag = true }: { cards: BoardCard[]; canDrag?: boolean }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<ProjectStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const drop = (status: ProjectStatus) => {
    setOver(null);
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status) return;
    const prev = card.status;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    start(async () => {
      const res = await changeProjectStatus(id, status);
      if (res.message) {
        setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: prev } : c)));
        setError(res.message);
      } else {
        setError(null);
        router.refresh();
      }
    });
  };

  return (
    <div>
      {error ? <p className="mb-2 rounded-[7px] bg-bad-soft px-3 py-2 text-[13px] text-bad">{error}</p> : null}
      <div className="grid auto-cols-[minmax(230px,1fr)] grid-flow-col items-start gap-3 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status) => {
          const items = cards.filter((c) => c.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                if (over !== status) setOver(status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(status);
              }}
              className={`min-h-[220px] rounded-card border p-2.5 transition-colors ${over === status ? "border-primary bg-primary-soft" : "border-line bg-surface-2"}`}
            >
              <div className="mb-2 flex items-center justify-between px-0.5">
                <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                <span className="font-mono text-xs text-muted">{items.length}</span>
              </div>
              {items.length === 0 ? <p className="py-6 text-center text-xs text-muted">なし</p> : null}
              {items.map((c) => (
                <div
                  key={c.id}
                  draggable={canDrag}
                  onDragStart={(e) => {
                    setDragId(c.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOver(null);
                  }}
                  className={`mb-2 rounded-[7px] border border-line bg-surface p-2.5 shadow-[0_1px_1px_rgba(0,0,0,0.03)] hover:border-line-strong ${canDrag ? "cursor-grab active:cursor-grabbing" : ""} ${dragId === c.id ? "opacity-40" : ""}`}
                >
                  <Link href={`/projects/${c.id}`} className="block text-[13.5px] font-bold leading-snug hover:underline" draggable={false}>
                    {c.name}
                  </Link>
                  <div className="mb-2 text-xs text-muted">{c.customerName}</div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      {c.owner ? <Avatar name={c.owner.name} color={c.owner.color} size={22} /> : null}
                      {c.dueLabel ? <span className={`tnum ${c.overdue ? "font-bold text-bad" : "text-ink-2"}`}>{c.dueLabel}</span> : null}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-muted">
                      {c.alertCount ? (
                        <span className={c.alertLevel === "bad" ? "text-bad" : "text-warn"} title="要確認">
                          <Icon name="alert" size={12} />
                        </span>
                      ) : null}
                      {c.openTasks}件
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {canDrag ? <p className="mt-1.5 text-xs text-muted">カードをドラッグしてステータスを変更できます。変更はすぐ保存され、変更履歴に残ります</p> : null}
    </div>
  );
}
