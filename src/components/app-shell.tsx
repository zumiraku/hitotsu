"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { GlobalSearch } from "@/components/global-search";
import { NAV_ADMIN, NAV_MAIN, type NavItem } from "@/lib/nav";
import type { Perm } from "@/lib/permissions";

export type ShellUser = { name: string; roleLabel: string; perms: Perm[] };

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

export function AppShell({ children, user }: { children: ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const allowed = (item: NavItem) => !item.perm || user.perms.includes(item.perm);
  const admin = NAV_ADMIN.filter(allowed);

  const link = (item: NavItem) => (
    <li key={item.href}>
      <Link href={item.href} onClick={close} className={`side-link ${isActive(item.href) ? "active" : ""}`}>
        {item.label}
      </Link>
    </li>
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-primary text-white">
        <div className="flex h-[44px] items-center gap-3 px-3">
          <button type="button" onClick={() => setOpen(true)} className="border border-white/60 px-2 py-0.5 text-[12px] lg:hidden">
            メニュー
          </button>
          <Link href="/" className="whitespace-nowrap text-[15px] font-bold text-white no-underline hover:no-underline">
            ヒトツ 業務管理システム
          </Link>
          {process.env.NODE_ENV !== "production" ? <span className="hidden text-[11px] text-white/80 md:inline">［開発環境］</span> : null}
          <div className="ml-auto hidden md:block">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex items-center gap-3 text-[12px] md:ml-0">
            <span className="hidden sm:inline">
              ログイン：
              <Link href="/settings/password" className="text-white underline" title="パスワードの変更">
                {user.name}
              </Link>
              （{user.roleLabel}）
            </span>
            <LogoutButton />
          </div>
        </div>
        <div className="border-t border-white/20 px-3 py-1.5 md:hidden">
          <GlobalSearch />
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          className={`fixed inset-y-0 left-0 z-40 w-[190px] border-r border-line bg-side pt-2 lg:static lg:block ${open ? "block" : "hidden"}`}
          aria-label="メニュー"
        >
          <div className="px-3 pb-2 lg:hidden">
            <button type="button" onClick={close} className="btn btn-sm">閉じる</button>
          </div>
          <ul>{NAV_MAIN.map(link)}</ul>
          {admin.length ? (
            <>
              <div className="mt-3 border-t border-line px-3 pb-1 pt-2 text-[11px] text-muted">管理</div>
              <ul>{admin.map(link)}</ul>
            </>
          ) : null}
        </nav>
        {open ? <button type="button" aria-label="メニューを閉じる" onClick={close} className="fixed inset-0 z-30 bg-black/40 lg:hidden" /> : null}

        <main className="min-w-0 flex-1 px-4 pb-10 pt-4 lg:px-5">{children}</main>
      </div>

      <footer className="border-t border-line bg-surface px-4 py-2 text-center text-[11px] text-muted">ヒトツ 業務管理システム Ver.{VERSION}</footer>
    </div>
  );
}
