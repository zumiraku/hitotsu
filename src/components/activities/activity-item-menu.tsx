"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { createActivity, deleteActivity, updateActivity } from "@/app/activities/actions";
import { ActivityDialog, type ActivityInitial, type ActivityOptions } from "@/components/activities/activity-dialog";
import { Icon } from "@/components/icons";

export function ActivityItemMenu({ id, initial, options }: { id: string; initial: ActivityInitial; options: ActivityOptions }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const close = useCallback(() => setEditing(false), []);

  const remove = () => {
    if (!window.confirm("この対応履歴を削除します。よろしいですか？")) return;
    start(async () => {
      const res = await deleteActivity(id);
      if (res.message) window.alert(res.message);
      else router.refresh();
    });
  };

  return (
    <span className="ml-auto flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      <button type="button" onClick={() => setEditing(true)} aria-label="編集" title="編集" className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-ink">
        <Icon name="edit" size={14} />
      </button>
      <button type="button" onClick={remove} disabled={pending} aria-label="削除" title="削除" className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-bad-soft hover:text-bad">
        <Icon name="trash" size={14} />
      </button>
      {editing ? <ActivityDialog title="対応履歴を編集" action={updateActivity.bind(null, id)} initial={initial} options={options} submitLabel="保存する" onClose={close} /> : null}
    </span>
  );
}

export function AddActivityButton({ options, preset, lockTarget = false, label = "対応履歴を記録", className = "btn" }: { options: ActivityOptions; preset?: Partial<ActivityInitial>; lockTarget?: boolean; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open ? (
        <ActivityDialog
          title="対応履歴を記録"
          action={createActivity}
          initial={{ type: "CALL", body: "", projectId: "", customerId: "", occurredAt: "", ...preset }}
          options={options}
          lockTarget={lockTarget}
          submitLabel="記録する"
          onClose={close}
        />
      ) : null}
    </>
  );
}
