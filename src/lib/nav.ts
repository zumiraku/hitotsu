import type { Perm } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: string; stage?: number; perm?: Perm };

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "ダッシュボード", icon: "dash" },
  { href: "/customers", label: "顧客・取引先", icon: "customers" },
  { href: "/projects", label: "案件", icon: "projects" },
  { href: "/tasks", label: "タスク", icon: "tasks" },
  { href: "/notes", label: "社内メモ・引き継ぎ", icon: "notes" },
  { href: "/files", label: "ファイル", icon: "files" },
];

export const NAV_ADMIN: NavItem[] = [
  { href: "/users", label: "ユーザー・権限", icon: "users", perm: "users" },
  { href: "/audit", label: "変更履歴", icon: "audit", perm: "audit" },
  { href: "/data", label: "データ入出力", icon: "data", perm: "csv.export" },
];
