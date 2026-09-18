"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { createActivity, deleteActivity, updateActivity } from "@/actions/activities";
import { ActivityDialog, type ActivityInitial, type ActivityOptions } from "@/components/activities/activity-dialog";

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
    <span className="text-[12.5px]">
      <button type="button" onClick={() => setEditing(true)} className="text-link hover:underline">編集</button>
      <span className="mx-1 text-muted">|</span>
      <button type="button" onClick={remove} disabled={pending} className="text-link hover:underline">削除</button>
      {editing ? <ActivityDialog title="対応履歴の編集" action={updateActivity.bind(null, id)} initial={initial} options={options} submitLabel="更新" onClose={close} /> : null}
    </span>
  );
}

export function AddActivityButton({ options, preset, lockTarget = false, label = "対応履歴登録", className = "btn" }: { options: ActivityOptions; preset?: Partial<ActivityInitial>; lockTarget?: boolean; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open ? (
        <ActivityDialog
          title="対応履歴の登録"
          action={createActivity}
          initial={{ type: "CALL", body: "", projectId: "", customerId: "", occurredAt: "", ...preset }}
          options={options}
          lockTarget={lockTarget}
          submitLabel="登録"
          onClose={close}
        />
      ) : null}
    </>
  );
}
