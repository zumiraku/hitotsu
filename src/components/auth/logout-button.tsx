"use client";

import { useTransition } from "react";
import { logout } from "@/actions/auth";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => logout())} disabled={pending} className="text-[12.5px] text-muted hover:text-ink hover:underline disabled:opacity-60">
      ログアウト
    </button>
  );
}
