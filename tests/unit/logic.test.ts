import { describe, expect, it } from "vitest";
import { parseQueryRules } from "@/lib/ai/query";
import { daysLeft, dueLabel, fmtDate, toInputDate } from "@/lib/format";
import { ROLE_PERMS, can } from "@/lib/permissions";
import { projectAlerts } from "@/lib/project-alerts";

describe("権限", () => {
  it("閲覧のみは見るだけ、管理者はすべて", () => {
    expect(can({ role: "VIEWER" }, "view")).toBe(true);
    expect(can({ role: "VIEWER" }, "edit")).toBe(false);
    expect(can({ role: "VIEWER" }, "amount")).toBe(false);
    expect(can({ role: "ADMIN" }, "users")).toBe(true);
    expect(can(null, "view")).toBe(false);
  });

  it("一般は削除・履歴閲覧・取込ができず、マネージャーはユーザー管理ができない", () => {
    expect(can({ role: "MEMBER" }, "delete")).toBe(false);
    expect(can({ role: "MEMBER" }, "audit")).toBe(false);
    expect(can({ role: "MEMBER" }, "csv.import")).toBe(false);
    expect(can({ role: "MEMBER" }, "edit")).toBe(true);
    expect(can({ role: "MANAGER" }, "users")).toBe(false);
    expect(can({ role: "MANAGER" }, "delete")).toBe(true);
  });

  it("上位ロールは下位ロールの権限をすべて含む", () => {
    const order = ["VIEWER", "MEMBER", "MANAGER", "ADMIN"] as const;
    for (let i = 1; i < order.length; i++) {
      for (const p of ROLE_PERMS[order[i - 1]]) expect(ROLE_PERMS[order[i]]).toContain(p);
    }
  });
});

describe("日付", () => {
  const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
  it("DATE 列（UTC 0時）を日本の日付として扱う", () => {
    expect(fmtDate(utc(2026, 9, 5))).toBe("2026/09/05");
    expect(toInputDate(utc(2026, 9, 5))).toBe("2026-09-05");
  });
  it("残り日数のラベル", () => {
    const today = new Date();
    const d = (n: number) => utc(today.getFullYear(), today.getMonth() + 1, today.getDate() + n);
    expect(daysLeft(d(0))).toBe(0);
    expect(dueLabel(d(0))).toBe("今日");
    expect(dueLabel(d(1))).toBe("明日");
    expect(dueLabel(d(5))).toBe("あと5日");
    expect(dueLabel(d(-3))).toBe("3日超過");
  });
});

describe("案件の要確認判定", () => {
  const ago = (days: number) => new Date(Date.now() - days * 86_400_000);
  const due = (n: number) => {
    const t = new Date();
    return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate() + n));
  };
  it("完了・失注は何も出さない", () => {
    expect(projectAlerts({ status: "DONE", dueDate: due(-10), overdueTasks: 3, lastActivityAt: null })).toEqual([]);
  });
  it("超過タスク・納期超過は赤、放置・保留は黄", () => {
    const a = projectAlerts({ status: "ACTIVE", dueDate: due(-2), overdueTasks: 1, lastActivityAt: ago(20) });
    expect(a.map((x) => x.level)).toEqual(["bad", "bad", "warn"]);
    expect(a[2].text).toBe("最終対応から20日経過");
    expect(projectAlerts({ status: "HOLD", dueDate: null, overdueTasks: 0, lastActivityAt: ago(1) })).toEqual([{ level: "warn", text: "保留中：再開時期を確認" }]);
  });
  it("直近に対応があれば放置扱いにしない", () => {
    expect(projectAlerts({ status: "ACTIVE", dueDate: due(10), overdueTasks: 0, lastActivityAt: ago(3) })).toEqual([]);
  });
});

describe("検索文の解釈", () => {
  const ctx = {
    users: [
      { id: "u3", name: "田中 大輔" },
      { id: "u2", name: "高橋 美咲" },
    ],
    customers: [
      { id: "c1", name: "サクラ物産株式会社", kana: "サクラブッサン" },
      { id: "c3", name: "株式会社ミナト運輸", kana: "ミナトウンユ" },
    ],
  };
  it("担当・期限・種類を拾う", () => {
    const r = parseQueryRules("田中さんの今週期限のタスク", ctx);
    expect(r.assignee?.id).toBe("u3");
    expect(r.time).toBe("week");
    expect(r.kind).toBe("task");
    expect(r.words).toEqual([]);
  });
  it("顧客・ステータスを拾い、検索語は残す", () => {
    const r = parseQueryRules("サクラ物産の進行中案件", ctx);
    expect(r.customer?.id).toBe("c1");
    expect(r.status).toBe("ACTIVE");
    const r2 = parseQueryRules("ミナト運輸 見積書", ctx);
    expect(r2.customer?.id).toBe("c3");
    expect(r2.kind).toBe("file");
    expect(r2.words).toEqual(["見積書"]);
  });
  it("何も拾えなければ普通の検索語", () => {
    const r = parseQueryRules("在庫管理", ctx);
    expect(r.chips).toEqual([]);
    expect(r.words).toEqual(["在庫管理"]);
  });
});
