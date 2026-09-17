import { z } from "zod";

export const noteSchema = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください").max(120, "120文字以内で入力してください"),
  category: z.enum(["MEMO", "HANDOVER", "RULE"], { error: "種類を選んでください" }),
  body: z.string().trim().min(1, "本文を入力してください").max(8000, "8000文字以内で入力してください"),
  projectId: z.string().trim(),
  customerId: z.string().trim(),
  pinned: z.string().transform((s) => s === "1" || s === "on"),
});

export type NoteInput = z.infer<typeof noteSchema>;
export type NoteFieldErrors = Partial<Record<keyof NoteInput, string[]>>;

export function parseNoteForm(formData: FormData) {
  const raw = Object.fromEntries(["title", "category", "body", "projectId", "customerId", "pinned"].map((k) => [k, String(formData.get(k) ?? "")]));
  const result = noteSchema.safeParse(raw);
  if (result.success) return { ok: true as const, data: result.data, raw };
  const errors: NoteFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof NoteInput;
    (errors[key] ??= []).push(issue.message);
  }
  return { ok: false as const, errors, raw };
}
