import type { Perm } from "@/lib/permissions";

export type NavItem = { href: string; label: string; perm?: Perm };

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "ホーム" },
  { href: "/customers", label: "顧客・取引先" },
  { href: "/projects", label: "案件" },
  { href: "/tasks", label: "タスク" },
  { href: "/notes", label: "社内メモ・引き継ぎ" },
  { href: "/files", label: "ファイル" },
];

export const NAV_ADMIN: NavItem[] = [
  { href: "/users", label: "ユーザー・権限", perm: "users" },
  { href: "/audit", label: "変更履歴", perm: "audit" },
  { href: "/data", label: "データ入出力", perm: "csv.export" },
];
