"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteNote, togglePin } from "@/actions/notes";

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

  return (
    <span className="flex shrink-0 items-center gap-1 text-[12px] font-normal">
      <button type="button" onClick={toggle} disabled={pending} className="text-link hover:underline">
        {pinned ? "ピン留め解除" : "ピン留め"}
      </button>
      <span className="text-muted">|</span>
      <Link href={`/notes/${id}/edit`}>編集</Link>
      <span className="text-muted">|</span>
      <button type="button" onClick={remove} disabled={pending} className="text-link hover:underline">
        削除
      </button>
    </span>
  );
}
