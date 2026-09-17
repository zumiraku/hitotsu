import type { Role } from "@/generated/prisma/enums";

export type Perm = "view" | "activity" | "edit" | "file" | "amount" | "csv.export" | "csv.import" | "delete" | "audit" | "users";

export const PERM_LABEL: Record<Perm, string> = {
  view: "顧客・案件・タスクの閲覧",
  activity: "対応履歴・タスク・メモの追加",
  edit: "顧客・案件の作成・編集",
  file: "ファイルの追加・削除",
  amount: "金額の閲覧",
  "csv.export": "CSV エクスポート",
  "csv.import": "CSV インポート",
  delete: "案件・顧客の削除",
  audit: "変更履歴の閲覧",
  users: "ユーザー・権限の管理",
};

export const PERM_ORDER: Perm[] = ["view", "activity", "edit", "file", "amount", "csv.export", "csv.import", "delete", "audit", "users"];

export const ROLE_PERMS: Record<Role, Perm[]> = {
  ADMIN: ["view", "activity", "edit", "file", "amount", "csv.export", "csv.import", "delete", "audit", "users"],
  MANAGER: ["view", "activity", "edit", "file", "amount", "csv.export", "csv.import", "delete", "audit"],
  MEMBER: ["view", "activity", "edit", "file", "amount", "csv.export"],
  VIEWER: ["view"],
};

export const ROLE_ORDER: Role[] = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];

export const ROLE_DESC: Record<Role, string> = {
  ADMIN: "すべての操作とユーザー管理",
  MANAGER: "編集・削除・金額・変更履歴・CSV 取込",
  MEMBER: "担当業務の入力・編集（削除と履歴閲覧は不可）",
  VIEWER: "閲覧のみ（金額は非表示）",
};

export function can(user: { role: Role } | null | undefined, perm: Perm) {
  return !!user && ROLE_PERMS[user.role].includes(perm);
}

export const DENIED = "この操作を行う権限がありません";
