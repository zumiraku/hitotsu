"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteFile } from "@/actions/files";

export function DeleteFileButton({ id, name, version }: { id: string; name: string; version: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const onClick = () => {
    if (!window.confirm(`「${name}」（第${version}版）を削除します。よろしいですか？`)) return;
    start(async () => {
      const res = await deleteFile(id);
      if (res.message) window.alert(res.message);
      else router.refresh();
    });
  };
  return (
    <button type="button" onClick={onClick} disabled={pending} className="shrink-0 text-[12px] text-link hover:underline disabled:opacity-50">
      削除
    </button>
  );
}
