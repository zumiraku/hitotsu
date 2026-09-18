import type { CustomerType, ProjectStatus } from "@/generated/prisma/enums";
import { CUSTOMER_TYPE_LABEL, STATUS_LABEL } from "@/lib/labels";

export function StatusLabel({ status }: { status: ProjectStatus }) {
  return <span className={status === "DONE" || status === "LOST" ? "text-muted" : ""}>{STATUS_LABEL[status]}</span>;
}

export function TypeLabel({ type }: { type: CustomerType }) {
  return <span>{CUSTOMER_TYPE_LABEL[type]}</span>;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="lbl mr-1">{children}</span>;
}
