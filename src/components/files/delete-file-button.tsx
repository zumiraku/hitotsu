"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteFile } from "@/actions/files";
import { Icon } from "@/components/icons";

export function DeleteFileButton({ id, name, version }: { id: string; name: string; version: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const onClick = () => {
    if (!window.confirm(`「${name}」（v${version}）を削除します。よろしいですか？`)) return;
    start(async () => {
      const res = await deleteFile(id);
      if (res.message) window.alert(res.message);
      else router.refresh();
    });
  };
  return (
    <button type="button" onClick={onClick} disabled={pending} aria-label="削除" title="削除" className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-bad-soft hover:text-bad disabled:opacity-50">
      <Icon name="trash" size={15} />
    </button>
  );
}
