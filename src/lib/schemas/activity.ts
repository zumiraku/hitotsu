import { z } from "zod";

// <input type="datetime-local"> の値。空なら今
const dateTimeField = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "日時の形式が正しくありません")]))
  .transform((s, ctx) => {
    if (!s) return new Date();
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "日時の形式が正しくありません" });
      return z.NEVER;
    }
    return d;
  });

export const activitySchema = z
  .object({
    type: z.enum(["CALL", "MAIL", "VISIT", "MEETING", "MEMO"], { error: "種別を選んでください" }),
    body: z.string().trim().min(1, "内容を入力してください").max(2000, "2000文字以内で入力してください"),
    projectId: z.string().trim(),
    customerId: z.string().trim(),
    occurredAt: dateTimeField,
  })
  .refine((v) => v.projectId || v.customerId, { path: ["projectId"], message: "案件か顧客のどちらかを選んでください" });

export type ActivityInput = z.infer<typeof activitySchema>;
export type ActivityFieldErrors = Partial<Record<keyof ActivityInput, string[]>>;

export function parseActivityForm(formData: FormData) {
  const raw = Object.fromEntries(["type", "body", "projectId", "customerId", "occurredAt"].map((k) => [k, String(formData.get(k) ?? "")]));
  const result = activitySchema.safeParse(raw);
  if (result.success) return { ok: true as const, data: result.data, raw };
  const errors: ActivityFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ActivityInput;
    (errors[key] ??= []).push(issue.message);
  }
  return { ok: false as const, errors, raw };
}
