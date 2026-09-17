export type NavItem = { href: string; label: string; icon: string; stage?: number };

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "ダッシュボード", icon: "dash" },
  { href: "/customers", label: "顧客・取引先", icon: "customers", stage: 2 },
  { href: "/projects", label: "案件", icon: "projects", stage: 3 },
  { href: "/tasks", label: "タスク", icon: "tasks", stage: 4 },
  { href: "/notes", label: "社内メモ・引き継ぎ", icon: "notes", stage: 5 },
  { href: "/files", label: "ファイル", icon: "files", stage: 6 },
];

export const NAV_ADMIN: NavItem[] = [
  { href: "/users", label: "ユーザー・権限", icon: "users", stage: 7 },
  { href: "/audit", label: "変更履歴", icon: "audit", stage: 7 },
  { href: "/data", label: "データ入出力", icon: "data", stage: 8 },
];
