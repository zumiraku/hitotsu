import { z } from "zod";

const dateField = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.iso.date("日付の形式が正しくありません")]))
  .transform((s) => (s ? new Date(`${s}T00:00:00Z`) : null));

export const taskSchema = z.object({
  title: z.string().trim().min(1, "タスク名を入力してください").max(200, "200文字以内で入力してください"),
  projectId: z.string().trim(),
  assigneeId: z.string().trim(),
  dueDate: dateField,
});

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskFieldErrors = Partial<Record<keyof TaskInput, string[]>>;

export function parseTaskForm(formData: FormData) {
  const raw = Object.fromEntries(["title", "projectId", "assigneeId", "dueDate"].map((k) => [k, String(formData.get(k) ?? "")]));
  const result = taskSchema.safeParse(raw);
  if (result.success) return { ok: true as const, data: result.data, raw };
  const errors: TaskFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof TaskInput;
    (errors[key] ??= []).push(issue.message);
  }
  return { ok: false as const, errors, raw };
}
