"use client";

import { useTransition } from "react";
import { logout } from "@/actions/auth";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => logout())} disabled={pending} className="border border-white/70 px-2 py-0.5 text-[12px] text-white hover:bg-white/10 disabled:opacity-60">
      ログアウト
    </button>
  );
}
