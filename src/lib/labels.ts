import type { ActivityType, CustomerType, NoteCategory, Priority, ProjectStatus, Role } from "@/generated/prisma/enums";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  LEAD: "見込み",
  ACTIVE: "進行中",
  HOLD: "保留",
  DONE: "完了",
  LOST: "失注",
};

export const STATUS_ORDER: ProjectStatus[] = ["LEAD", "ACTIVE", "HOLD", "DONE", "LOST"];

export const PRIORITY_LABEL: Record<Priority, string> = { HIGH: "高", MID: "中", LOW: "低" };

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "管理者",
  MANAGER: "マネージャー",
  MEMBER: "一般",
  VIEWER: "閲覧のみ",
};

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  CUSTOMER: "顧客",
  PARTNER: "取引先",
  BOTH: "顧客・取引先",
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  CALL: "電話",
  MAIL: "メール",
  VISIT: "訪問",
  MEETING: "来社",
  MEMO: "メモ",
};

export const NOTE_CATEGORY_LABEL: Record<NoteCategory, string> = {
  MEMO: "メモ",
  HANDOVER: "引き継ぎ",
  RULE: "ルール",
};

export const isClosed = (s: ProjectStatus) => s === "DONE" || s === "LOST";
