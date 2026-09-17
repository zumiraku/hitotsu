import { describe, expect, it } from "vitest";
import { parseActivityForm } from "@/lib/schemas/activity";
import { parseCustomerForm } from "@/lib/schemas/customer";
import { parseNoteForm } from "@/lib/schemas/note";
import { normalizeAmount, parseProjectForm } from "@/lib/schemas/project";
import { parseTaskForm } from "@/lib/schemas/task";

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};

describe("顧客フォーム", () => {
  it("会社名は必須、メールは形式チェック、タグは分割される", () => {
    const bad = parseCustomerForm(fd({ name: "  ", type: "CUSTOMER", email: "bad", tags: "" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.name?.[0]).toBe("会社名を入力してください");
      expect(bad.errors.email?.[0]).toContain("メールアドレス");
    }
    const ok = parseCustomerForm(fd({ name: " テスト商事 ", type: "BOTH", email: "", tel: "03-1234-5678", tags: "新規, 紹介,, 重要", ownerId: "" }));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.name).toBe("テスト商事");
      expect(ok.data.tags).toEqual(["新規", "紹介", "重要"]);
      expect(ok.data.type).toBe("BOTH");
    }
  });

  it("電話番号に文字が混ざっていると弾く", () => {
    const r = parseCustomerForm(fd({ name: "A", type: "CUSTOMER", tel: "でんわ", email: "", tags: "" }));
    expect(r.ok).toBe(false);
  });
});

describe("金額の正規化", () => {
  it.each([
    ["1,200,000", "1200000"],
    ["¥120万", "1200000"],
    ["１２０万", "1200000"],
    ["1.5億", "150000000"],
    ["800000円", "800000"],
    [" 3 000 ", "3000"],
    ["", ""],
    ["abc", "abc"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeAmount(input)).toBe(expected);
  });
});

describe("案件フォーム", () => {
  const base = { name: "テスト案件", customerId: "c1", status: "LEAD", priority: "MID", ownerId: "", amount: "", startDate: "", dueDate: "", summary: "", tags: "" };

  it("納期は開始日以降でないと弾く", () => {
    const r = parseProjectForm(fd({ ...base, startDate: "2026-10-10", dueDate: "2026-10-01" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.dueDate?.[0]).toBe("納期は開始日以降にしてください");
  });

  it("日付は UTC の DATE に、メンバーは配列になる", () => {
    const r = parseProjectForm(fd({ ...base, dueDate: "2026-12-01", amount: "120万", memberIds: ["u1", "u2"] }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.dueDate?.toISOString()).toBe("2026-12-01T00:00:00.000Z");
      expect(r.data.amount).toBe(1200000);
      expect(r.data.memberIds).toEqual(["u1", "u2"]);
    }
  });

  it("顧客が未選択ならエラー", () => {
    const r = parseProjectForm(fd({ ...base, customerId: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.customerId?.[0]).toBe("顧客を選んでください");
  });
});

describe("タスク・対応履歴・メモ", () => {
  it("タスク名は必須", () => {
    expect(parseTaskForm(fd({ title: "", projectId: "", assigneeId: "", dueDate: "" })).ok).toBe(false);
    const r = parseTaskForm(fd({ title: "見積の確認", projectId: "", assigneeId: "", dueDate: "2026-09-20" }));
    expect(r.ok && r.data.dueDate?.toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });

  it("対応履歴は案件か顧客のどちらかが必要、日時は空なら今", () => {
    const bad = parseActivityForm(fd({ type: "CALL", body: "電話した", projectId: "", customerId: "", occurredAt: "" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.projectId?.[0]).toContain("どちらか");
    const ok = parseActivityForm(fd({ type: "MAIL", body: "送付", projectId: "p1", customerId: "", occurredAt: "" }));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(Math.abs(ok.data.occurredAt.getTime() - Date.now())).toBeLessThan(5000);
  });

  it("メモのピン留めはチェックボックスの値から真偽値に", () => {
    const r = parseNoteForm(fd({ title: "t", category: "RULE", body: "b", projectId: "", customerId: "", pinned: "1" }));
    expect(r.ok && r.data.pinned).toBe(true);
    const r2 = parseNoteForm(fd({ title: "t", category: "RULE", body: "b", projectId: "", customerId: "", pinned: "" }));
    expect(r2.ok && r2.data.pinned).toBe(false);
  });
});
