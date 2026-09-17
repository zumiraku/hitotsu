import type { CustomerType, ProjectStatus } from "@/generated/prisma/enums";
import { CUSTOMER_TYPE_LABEL, STATUS_CLASS, STATUS_LABEL } from "@/lib/labels";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

const TYPE_CLASS: Record<CustomerType, string> = {
  CUSTOMER: "bg-info-soft text-info",
  PARTNER: "bg-neutral-soft text-neutral",
  BOTH: "bg-violet-soft text-violet",
};

export function CustomerTypeBadge({ type }: { type: CustomerType }) {
  return <span className={`badge ${TYPE_CLASS[type]}`}>{CUSTOMER_TYPE_LABEL[type]}</span>;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="mr-1 inline-block rounded bg-surface-3 px-1.5 text-[11.5px] leading-5 text-ink-2">{children}</span>;
}
