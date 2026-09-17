"use client";

import { useState, useTransition } from "react";
import { deleteProject } from "@/app/projects/actions";

export function DeleteProjectButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const onClick = () => {
    if (!window.confirm(`「${name}」を削除します。よろしいですか？\n（一覧から消えますが、変更履歴には残ります）`)) return;
    start(async () => {
      const res = await deleteProject(id);
      if (res?.message) setMessage(res.message);
    });
  };

  return (
    <span className="relative">
      <button type="button" onClick={onClick} disabled={pending} className="btn text-bad disabled:opacity-60">
        {pending ? "削除中…" : "削除"}
      </button>
      {message ? <span role="alert" className="absolute right-0 top-full z-10 mt-1 w-72 rounded-[7px] bg-bad-soft px-3 py-2 text-[12.5px] text-bad shadow-card">{message}</span> : null}
    </span>
  );
}
