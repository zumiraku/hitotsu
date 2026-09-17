"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Role } from "@/generated/prisma/enums";
import { changeRole, resetPassword, setActive, updateProfile } from "@/actions/users";
import { Avatar } from "@/components/ui/avatar";
import { inputBase } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/labels";
import { ROLE_ORDER } from "@/lib/permissions";

export type UserRowData = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: Role;
  color: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginText: string;
  activeProjects: number;
};

const ROLE_CLASS: Record<Role, string> = { ADMIN: "bg-bad-soft text-bad", MANAGER: "bg-info-soft text-info", MEMBER: "bg-good-soft text-good", VIEWER: "bg-neutral-soft text-neutral" };

export function UserRow({ user, isMe }: { user: UserRowData; isMe: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const run = (fn: () => Promise<{ message?: string; password?: string }>, okText?: (r: { password?: string }) => string) =>
    start(async () => {
      const res = await fn();
      if (res.message) setNotice({ kind: "bad", text: res.message });
      else {
        setNotice(okText ? { kind: "ok", text: okText(res) } : null);
        router.refresh();
      }
    });

  const onReset = () => {
    if (!window.confirm(`${user.name} さんのパスワードをリセットして仮パスワードを発行します。本人のログイン中セッションは解除されます。よろしいですか？`)) return;
    run(() => resetPassword(user.id), (r) => `仮パスワード：${r.password}（この画面を閉じると再表示できません）`);
  };

  const onToggleActive = () => {
    const next = !user.isActive;
    if (!window.confirm(next ? `${user.name} さんを有効にします。` : `${user.name} さんを無効にします。ログインできなくなり、担当中のデータはそのまま残ります。`)) return;
    run(() => setActive(user.id, next));
  };

  const onSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateProfile(user.id, fd);
      if (res.message) setNotice({ kind: "bad", text: res.message });
      else {
        setEditing(false);
        setNotice(null);
        router.refresh();
      }
    });
  };

  return (
    <>
      <tr className={`tr-link ${user.isActive ? "" : "opacity-60"} ${pending ? "opacity-60" : ""}`}>
        <td className="td">
          {editing ? (
            <form onSubmit={onSaveProfile} className="flex flex-wrap items-center gap-1.5">
              <input name="name" defaultValue={user.name} aria-label="名前" className={`${inputBase} h-8 w-36`} required maxLength={50} />
              <input name="department" defaultValue={user.department ?? ""} aria-label="所属" placeholder="所属" className={`${inputBase} h-8 w-36`} maxLength={50} />
              <button type="submit" className="btn h-8 px-2.5 text-[12.5px]">保存</button>
              <button type="button" onClick={() => setEditing(false)} className="btn h-8 px-2.5 text-[12.5px]">取消</button>
            </form>
          ) : (
            <span className="flex items-center gap-2.5">
              <Avatar name={user.name} color={user.color} />
              <span className="min-w-0">
                <span className="block font-bold">
                  {user.name}
                  {isMe ? <span className="ml-1.5 text-[11px] font-normal text-muted">（自分）</span> : null}
                </span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </span>
            </span>
          )}
        </td>
        <td className="td whitespace-nowrap">{user.department || <span className="text-muted">—</span>}</td>
        <td className="td">
          <select
            value={user.role}
            onChange={(e) => run(() => changeRole(user.id, e.target.value as Role))}
            disabled={pending}
            aria-label="ロール"
            className={`h-7 cursor-pointer rounded-full border border-line pl-2.5 pr-7 text-[12.5px] font-bold disabled:opacity-60 ${ROLE_CLASS[user.role]}`}
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </td>
        <td className="td">
          {user.isActive ? <span className="badge bg-good-soft text-good">有効</span> : <span className="badge bg-neutral-soft text-neutral">無効</span>}
          {user.mustChangePassword ? <span className="ml-1 badge bg-warn-soft text-warn">仮PW</span> : null}
        </td>
        <td className="td tnum text-right">{user.activeProjects}</td>
        <td className="td tnum whitespace-nowrap text-muted">{user.lastLoginText}</td>
        <td className="td">
          <span className="flex justify-end gap-1">
            <button type="button" onClick={() => setEditing(true)} disabled={pending || editing} className="btn h-7 px-2.5 text-[12.5px]">編集</button>
            <button type="button" onClick={onReset} disabled={pending} className="btn h-7 px-2.5 text-[12.5px]">PW再発行</button>
            {!isMe ? (
              <button type="button" onClick={onToggleActive} disabled={pending} className={`btn h-7 px-2.5 text-[12.5px] ${user.isActive ? "text-bad" : ""}`}>
                {user.isActive ? "無効化" : "有効化"}
              </button>
            ) : null}
          </span>
        </td>
      </tr>
      {notice ? (
        <tr>
          <td colSpan={7} className={`px-3 pb-2 text-[12.5px] ${notice.kind === "ok" ? "text-good" : "text-bad"}`}>
            {notice.kind === "ok" ? <span className="font-mono">{notice.text}</span> : notice.text}
          </td>
        </tr>
      ) : null}
    </>
  );
}
