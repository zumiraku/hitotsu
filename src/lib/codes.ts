import type { Prisma } from "@/generated/prisma/client";

const pad = (n: number) => String(n).padStart(4, "0");

// 採番は DB のシーケンスに任せる（同時登録でも重複しない）
export async function nextCustomerCode(tx: Prisma.TransactionClient) {
  const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('customer_code_seq') AS n`;
  return `C-${pad(Number(n))}`;
}

export async function nextProjectCode(tx: Prisma.TransactionClient) {
  const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('project_code_seq') AS n`;
  return `PJ-${pad(Number(n))}`;
}
