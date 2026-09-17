"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteNote, togglePin } from "@/actions/notes";
import { Icon } from "@/components/icons";

export function NoteCardMenu({ id, pinned: initialPinned }: { id: string; pinned: boolean }) {
  const router = useRouter();
  const [pinned, setPinned] = useState(initialPinned);
  const [pending, start] = useTransition();

  const toggle = () => {
    const next = !pinned;
    setPinned(next);
    start(async () => {
      const res = await togglePin(id, next);
      if (res.message) {
        setPinned(!next);
        window.alert(res.message);
      } else router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm("このメモを削除します。よろしいですか？")) return;
    start(async () => {
      const res = await deleteNote(id);
      if (res.message) window.alert(res.message);
      else router.refresh();
    });
  };

  const btn = "flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface-2";
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={pinned} aria-label={pinned ? "ピン留めを外す" : "ピン留めする"} title={pinned ? "ピン留めを外す" : "ピン留めする"} className={`${btn} ${pinned ? "text-warn" : "text-muted"}`}>
        <Icon name="pinned" size={15} />
      </button>
      <Link href={`/notes/${id}/edit`} aria-label="編集" title="編集" className={`${btn} text-muted hover:text-ink`}>
        <Icon name="edit" size={15} />
      </Link>
      <button type="button" onClick={remove} disabled={pending} aria-label="削除" title="削除" className={`${btn} text-muted hover:bg-bad-soft hover:text-bad`}>
        <Icon name="trash" size={15} />
      </button>
    </span>
  );
}
