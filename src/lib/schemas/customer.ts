import { z } from "zod";

const text = (max: number) => z.string().trim().max(max, `${max}文字以内で入力してください`);

export const customerSchema = z.object({
  name: z.string().trim().min(1, "会社名を入力してください").max(100, "100文字以内で入力してください"),
  kana: text(100),
  type: z.enum(["CUSTOMER", "PARTNER", "BOTH"], { error: "種別を選んでください" }),
  industry: text(50),
  contactName: text(50),
  contactTitle: text(50),
  tel: text(30).refine((v) => v === "" || /^[0-9０-９+\-() 　]+$/.test(v), "電話番号の形式が正しくありません"),
  email: z.union([z.literal(""), z.email("メールアドレスの形式が正しくありません")]),
  address: text(200),
  ownerId: z.string().trim(),
  tags: z
    .string()
    .trim()
    .transform((s) => s.split(/[,、，;]/).map((t) => t.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(20, "タグは20文字以内")).max(10, "タグは10個まで")),
  note: text(2000),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerFieldErrors = Partial<Record<keyof CustomerInput, string[]>>;

export function parseCustomerForm(formData: FormData) {
  const raw = Object.fromEntries(
    ["name", "kana", "type", "industry", "contactName", "contactTitle", "tel", "email", "address", "ownerId", "tags", "note"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const result = customerSchema.safeParse(raw);
  if (result.success) return { ok: true as const, data: result.data, raw };
  const errors: CustomerFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof CustomerInput;
    (errors[key] ??= []).push(issue.message);
  }
  return { ok: false as const, errors, raw };
}
