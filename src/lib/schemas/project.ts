import { z } from "zod";

const text = (max: number) => z.string().trim().max(max, `${max}文字以内で入力してください`);

// "2026-09-20" → DATE 列用の UTC 0時。空なら null
const dateField = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.iso.date("日付の形式が正しくありません")]))
  .transform((s) => (s ? new Date(`${s}T00:00:00Z`) : null));

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "案件名を入力してください").max(120, "120文字以内で入力してください"),
    customerId: z.string().trim().min(1, "顧客を選んでください"),
    status: z.enum(["LEAD", "ACTIVE", "HOLD", "DONE", "LOST"], { error: "ステータスを選んでください" }),
    priority: z.enum(["HIGH", "MID", "LOW"], { error: "優先度を選んでください" }),
    ownerId: z.string().trim(),
    memberIds: z.array(z.string().trim().min(1)).max(20, "メンバーは20人まで"),
    amount: z
      .string()
      .trim()
      .transform((s) => s.replace(/[,，¥￥\s]/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)))
      .pipe(z.union([z.literal(""), z.string().regex(/^\d{1,10}$/, "金額は数字で入力してください（10桁まで）")]))
      .transform((s) => (s ? Number(s) : 0)),
    startDate: dateField,
    dueDate: dateField,
    summary: text(4000),
    tags: z
      .string()
      .trim()
      .transform((s) => s.split(/[,、，;]/).map((t) => t.trim()).filter(Boolean))
      .pipe(z.array(z.string().max(20, "タグは20文字以内")).max(10, "タグは10個まで")),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.startDate <= v.dueDate, { path: ["dueDate"], message: "納期は開始日以降にしてください" });

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectFieldErrors = Partial<Record<keyof ProjectInput, string[]>>;

const TEXT_KEYS = ["name", "customerId", "status", "priority", "ownerId", "amount", "startDate", "dueDate", "summary", "tags"] as const;

export function parseProjectForm(formData: FormData) {
  const raw: Record<string, string> = Object.fromEntries(TEXT_KEYS.map((k) => [k, String(formData.get(k) ?? "")]));
  const memberIds = formData.getAll("memberIds").map(String);
  const result = projectSchema.safeParse({ ...raw, memberIds });
  raw.memberIds = memberIds.join(",");
  if (result.success) return { ok: true as const, data: result.data, raw };
  const errors: ProjectFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ProjectInput;
    (errors[key] ??= []).push(issue.message);
  }
  return { ok: false as const, errors, raw };
}
