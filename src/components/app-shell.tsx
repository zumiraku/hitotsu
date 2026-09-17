"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { GlobalSearch } from "@/components/global-search";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { NAV_ADMIN, NAV_MAIN, type NavItem } from "@/lib/nav";
import type { Perm } from "@/lib/permissions";

export type ShellUser = { name: string; color: string; roleLabel: string; perms: Perm[] };

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-side-text hover:bg-side-2 hover:text-white ${
        active ? "bg-side-active font-bold text-white" : ""
      }`}
    >
      <Icon name={item.icon} className="shrink-0 opacity-90" />
      <span className="flex-1">{item.label}</span>
      {item.stage ? <span className="rounded px-1 text-[10px] tracking-wider opacity-45">S{item.stage}</span> : null}
    </Link>
  );
}

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

  return (
    <div className="flex min-h-full">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col bg-side text-side-text transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 pb-3.5 pt-4">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#4c8dc2] to-[#1e5b85] font-display text-[17px] font-bold text-white">
            ヒ
          </div>
          <div>
            <div className="font-display text-[16px] font-bold tracking-wider text-white">ヒトツ</div>
            <div className="text-[11px] tracking-wider opacity-75">業務を、ひとつに。</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
          {NAV_MAIN.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} onClick={close} />
          ))}
          {admin.length ? <div className="px-2.5 pb-1 pt-3.5 text-[11px] tracking-[0.12em] opacity-55">管理</div> : null}
          {admin.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} onClick={close} />
          ))}
        </nav>
        <div className="border-t border-white/10 px-3.5 py-3 text-[11px] tracking-wider opacity-70">ヒトツ v{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</div>
      </aside>

      {open ? <button type="button" aria-label="メニューを閉じる" onClick={close} className="fixed inset-0 z-30 bg-black/50 lg:hidden" /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-3 lg:px-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="メニュー"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 lg:hidden"
          >
            <Icon name="menu" />
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            {process.env.NODE_ENV !== "production" ? <span className="hidden rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-bold tracking-wider text-warn sm:inline">開発環境</span> : null}
            <Link href="/settings/password" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-2" title="パスワードの変更">
              <Avatar name={user.name} color={user.color} size={26} />
              <span className="hidden leading-tight sm:block">
                <span className="block text-[13px] text-ink">{user.name}</span>
                <span className="block text-[11px] text-muted">{user.roleLabel}</span>
              </span>
            </Link>
            <LogoutButton />
          </div>
        </header>
        <main className="w-full max-w-[1320px] px-4 pb-12 pt-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
