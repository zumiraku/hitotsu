"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Role } from "@/generated/prisma/enums";
import { changeRole, resetPassword, setActive, updateProfile } from "@/actions/users";
import { ROLE_LABEL } from "@/lib/labels";
import { ROLE_ORDER } from "@/lib/permissions";

export type UserRowData = {
  id: string;
  name: string;
  loginId: string;
  department: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginText: string;
  activeProjects: number;
};

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
    if (!window.confirm(`${user.name} さんのパスワードをリセットして仮パスワードを発行します。\n本人のログイン中のセッションは解除されます。よろしいですか？`)) return;
    run(() => resetPassword(user.id), (r) => `仮パスワード：${r.password}　（この画面を閉じると再表示できません）`);
  };

  const onToggleActive = () => {
    const next = !user.isActive;
    if (!window.confirm(next ? `${user.name} さんを有効にします。よろしいですか？` : `${user.name} さんを無効にします。ログインできなくなりますが、担当中のデータはそのまま残ります。よろしいですか？`)) return;
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

  const link = "text-link hover:underline disabled:opacity-50";

  return (
    <>
      <tr className={`tr-link ${!user.isActive || pending ? "text-muted" : ""}`}>
        {editing ? (
          <td className="td" colSpan={3}>
            <form onSubmit={onSaveProfile} className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
              氏名：
              <input name="name" defaultValue={user.name} className="inp w-36" required maxLength={50} />
              所属：
              <input name="department" defaultValue={user.department ?? ""} className="inp w-36" maxLength={50} />
              <button type="submit" className="btn btn-sm">更新</button>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-sm">取消</button>
            </form>
          </td>
        ) : (
          <>
            <td className="td whitespace-nowrap">
              {user.name}
              {isMe ? <span className="ml-1 text-[11px] text-muted">（自分）</span> : null}
            </td>
            <td className="td">{user.loginId}</td>
            <td className="td whitespace-nowrap">{user.department || <span className="text-muted">－</span>}</td>
          </>
        )}
        <td className="td">
          <select value={user.role} onChange={(e) => run(() => changeRole(user.id, e.target.value as Role))} disabled={pending} aria-label="ロール" className="inp">
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </td>
        <td className="td whitespace-nowrap">
          {user.isActive ? "有効" : "無効"}
          {user.mustChangePassword ? <span className="lbl ml-1">仮パスワード</span> : null}
        </td>
        <td className="td tnum text-right">{user.activeProjects}</td>
        <td className="td tnum whitespace-nowrap">{user.lastLoginText}</td>
        <td className="td whitespace-nowrap text-[12.5px]">
          <button type="button" onClick={() => setEditing(true)} disabled={pending || editing} className={link}>編集</button>
          <span className="mx-1 text-muted">|</span>
          <button type="button" onClick={onReset} disabled={pending} className={link}>パスワード再発行</button>
          {!isMe ? (
            <>
              <span className="mx-1 text-muted">|</span>
              <button type="button" onClick={onToggleActive} disabled={pending} className={link}>
                {user.isActive ? "無効化" : "有効化"}
              </button>
            </>
          ) : null}
        </td>
      </tr>
      {notice ? (
        <tr>
          <td colSpan={8} className={`td text-[12.5px] ${notice.kind === "ok" ? "text-good" : "text-bad"}`}>{notice.text}</td>
        </tr>
      ) : null}
    </>
  );
}
