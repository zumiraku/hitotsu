"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { changeProjectStatus } from "@/actions/projects";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";

export type BoardCard = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  customerName: string;
  ownerName: string | null;
  dueText: string | null;
  overdue: boolean;
  openTasks: number;
  alerts: string[];
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
      {error ? <p className="msg-bad mb-2">{error}</p> : null}
      {canDrag ? <p className="mb-2 text-[12px] text-muted">案件をドラッグして別の列に移すと、ステータスが変更されます。</p> : null}
      <div className="board grid auto-cols-[minmax(220px,1fr)] grid-flow-col items-start gap-2 overflow-x-auto pb-2">
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
              className={`min-h-[220px] border ${over === status ? "border-primary bg-[#f3f7fc]" : "border-line bg-surface-2"}`}
            >
              <div className="border-b border-line bg-surface-3 px-2 py-1 text-[12.5px] font-bold">
                {STATUS_LABEL[status]}（{items.length}）
              </div>
              <div className="p-2">
                {items.length === 0 ? <p className="py-4 text-center text-[12px] text-muted">なし</p> : null}
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
                    className={`mb-2 border border-line bg-surface p-2 text-[12.5px] ${canDrag ? "cursor-move" : ""} ${dragId === c.id ? "opacity-40" : ""}`}
                  >
                    <div className="text-[11px] text-muted">{c.code}</div>
                    <Link href={`/projects/${c.id}`} draggable={false}>
                      {c.name}
                    </Link>
                    <div className="mt-0.5 text-[12px]">{c.customerName}</div>
                    <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-[11.5px] text-ink-2">
                      <span>担当：{c.ownerName ?? "未割当"}</span>
                      <span>未完了 {c.openTasks}件</span>
                    </div>
                    {c.dueText ? <div className={`text-[11.5px] ${c.overdue ? "text-bad" : "text-ink-2"}`}>納期：{c.dueText}</div> : null}
                    {c.alerts.length ? <div className="mt-0.5 text-[11.5px] text-warn">{c.alerts.join("、")}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
