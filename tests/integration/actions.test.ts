import { describe, expect, it } from "vitest";
import { createActivity } from "@/actions/activities";
import { createCustomer, deleteCustomer, updateCustomer } from "@/actions/customers";
import { importRows } from "@/actions/import";
import { createNote, togglePin } from "@/actions/notes";
import { changeProjectStatus, createProject, deleteProject, updateProject } from "@/actions/projects";
import { createTask, toggleTask } from "@/actions/tasks";
import { changeRole, inviteUser } from "@/actions/users";
import { db } from "@/lib/db";
import { DENIED } from "@/lib/permissions";
import { searchAll } from "@/lib/search";
import { RedirectError, customerId, fd, lastAudit, loginAs, projectId } from "./helpers";

const customerForm = (name: string) => fd({ name, kana: "", type: "CUSTOMER", industry: "IT", contactName: "", contactTitle: "", tel: "", email: "", address: "", ownerId: "", tags: "テスト", note: "" });

describe("権限の強制（画面ではなく処理側）", () => {
  it("閲覧のみは作成・編集・記録のどれもできない", async () => {
    await loginAs("yamamoto@example.com");
    expect((await createCustomer(null, customerForm("拒否されるはず")))?.message).toBe(DENIED);
    expect((await createTask(null, fd({ title: "x", projectId: "", assigneeId: "", dueDate: "" })))?.message).toBe(DENIED);
    expect((await createNote(null, fd({ title: "x", category: "MEMO", body: "y", projectId: "", customerId: "", pinned: "" })))?.message).toBe(DENIED);
    expect((await changeProjectStatus(await projectId("在庫管理システム刷新"), "HOLD")).message).toBe(DENIED);
    expect(await db.customer.count({ where: { name: "拒否されるはず" } })).toBe(0);
  });

  it("一般は削除と CSV 取込ができない", async () => {
    await loginAs("tanaka@example.com");
    expect((await deleteCustomer(await customerId("株式会社フジ倉庫")))?.message).toBe(DENIED);
    expect((await deleteProject(await projectId("安全大会 資料作成")))?.message).toBe(DENIED);
    expect((await importRows("customers", [{ name: "x" }])).message).toBe(DENIED);
    expect((await inviteUser(null, fd({ name: "a", email: "a@example.com", department: "", role: "MEMBER" })))?.message).toBe(DENIED);
  });

  it("マネージャーはユーザー管理ができない", async () => {
    await loginAs("takahashi@example.com");
    const tanaka = await db.user.findUniqueOrThrow({ where: { email: "tanaka@example.com" } });
    expect((await changeRole(tanaka.id, "VIEWER")).message).toBe(DENIED);
  });
});

describe("顧客", () => {
  it("作成するとコードが採番され、詳細へリダイレクトし、変更履歴に残る", async () => {
    await loginAs("tanaka@example.com");
    await expect(createCustomer(null, customerForm("統合テスト商事"))).rejects.toThrow(RedirectError);
    const c = await db.customer.findFirstOrThrow({ where: { name: "統合テスト商事" } });
    expect(c.code).toMatch(/^C-\d{4}$/);
    expect(c.tags).toEqual(["テスト"]);
    expect((await lastAudit("customer", c.id))?.action).toBe("CREATE");
  });

  it("編集すると変わった項目だけ差分が記録される", async () => {
    await loginAs("tanaka@example.com");
    const c = await db.customer.findFirstOrThrow({ where: { name: "統合テスト商事" } });
    await expect(updateCustomer(c.id, null, fd({ ...Object.fromEntries(customerForm("統合テスト商事").entries()), industry: "商社", tel: "03-0000-1111" }))).rejects.toThrow(RedirectError);
    const log = await lastAudit("customer", c.id);
    const fields = (log!.changes as { field: string }[]).map((x) => x.field).sort();
    expect(fields).toEqual(["業種", "電話"]);
  });

  it("案件が残っている顧客は削除できず、なければ論理削除される", async () => {
    await loginAs("takahashi@example.com");
    const withProjects = await customerId("サクラ物産株式会社");
    expect((await deleteCustomer(withProjects))?.message).toContain("案件が");
    const c = await db.customer.findFirstOrThrow({ where: { name: "統合テスト商事" } });
    await expect(deleteCustomer(c.id)).rejects.toThrow(RedirectError);
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).deletedAt).not.toBeNull();
    expect((await lastAudit("customer", c.id))?.action).toBe("DELETE");
  });
});

describe("案件・タスク・対応履歴・メモ", () => {
  it("案件の作成・ステータス変更・メンバー変更が履歴に残る", async () => {
    const me = await loginAs("tanaka@example.com");
    const suzuki = await db.user.findUniqueOrThrow({ where: { email: "suzuki@example.com" } });
    const cid = await customerId("ヤマネ建設株式会社");
    await expect(createProject(null, fd({ name: "統合テスト案件", customerId: cid, status: "LEAD", priority: "HIGH", ownerId: me.id, amount: "120万", startDate: "2026-10-01", dueDate: "2026-12-01", summary: "", tags: "テスト", memberIds: [suzuki.id] }))).rejects.toThrow(RedirectError);
    const p = await db.project.findFirstOrThrow({ where: { name: "統合テスト案件" }, include: { members: true } });
    expect(p.code).toMatch(/^PJ-\d{4}$/);
    expect(p.amount).toBe(1200000);
    expect(p.members.map((m) => m.userId)).toEqual([suzuki.id]);

    await changeProjectStatus(p.id, "ACTIVE");
    const st = await lastAudit("project", p.id);
    expect(st?.action).toBe("STATUS");
    expect((st!.changes as { from: string; to: string }[])[0]).toMatchObject({ from: "見込み", to: "進行中" });

    await expect(updateProject(p.id, null, fd({ name: "統合テスト案件", customerId: cid, status: "ACTIVE", priority: "HIGH", ownerId: me.id, amount: "1200000", startDate: "2026-10-01", dueDate: "2026-12-01", summary: "", tags: "テスト", memberIds: [] }))).rejects.toThrow(RedirectError);
    const up = await lastAudit("project", p.id);
    expect((up!.changes as { field: string }[]).map((x) => x.field)).toEqual(["メンバー"]);
  });

  it("タスクの追加と完了、対応履歴の記録が案件の履歴と更新日時に反映される", async () => {
    await loginAs("suzuki@example.com");
    const pid = await projectId("統合テスト案件");
    const before = (await db.project.findUniqueOrThrow({ where: { id: pid } })).updatedAt;
    expect((await createTask(null, fd({ title: "統合テストのタスク", projectId: pid, assigneeId: "", dueDate: "2026-11-01" })))?.ok).toBe(true);
    const t = await db.task.findFirstOrThrow({ where: { title: "統合テストのタスク" } });
    expect((await toggleTask(t.id, true)).message).toBeUndefined();
    expect((await db.task.findUniqueOrThrow({ where: { id: t.id } })).done).toBe(true);

    expect((await createActivity(null, fd({ type: "CALL", body: "統合テストの電話", projectId: pid, customerId: "", occurredAt: "" })))?.ok).toBe(true);
    const a = await db.activity.findFirstOrThrow({ where: { projectId: pid, body: "統合テストの電話" } });
    expect(a.type).toBe("CALL");
    const log = await lastAudit("project", pid);
    expect((log!.changes as { field: string }[])[0].field).toBe("対応履歴を追加（電話）");
    expect((await db.project.findUniqueOrThrow({ where: { id: pid } })).updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it("メモの作成とピン留め", async () => {
    await loginAs("suzuki@example.com");
    const pid = await projectId("統合テスト案件");
    await expect(createNote(null, fd({ title: "統合テストのメモ", category: "HANDOVER", body: "本文", projectId: pid, customerId: "", pinned: "" }))).rejects.toThrow(RedirectError);
    const n = await db.note.findFirstOrThrow({ where: { title: "統合テストのメモ" } });
    expect(n.category).toBe("HANDOVER");
    await togglePin(n.id, true);
    expect((await db.note.findUniqueOrThrow({ where: { id: n.id } })).pinned).toBe(true);
  });

  it("案件の削除は論理削除。紐づくタスク・メモは検索に出なくなる", async () => {
    await loginAs("takahashi@example.com");
    const pid = await projectId("統合テスト案件");
    const before = await searchAll({ words: ["統合テスト"] });
    expect(before.map((g) => g.kind)).toEqual(expect.arrayContaining(["task", "note", "activity"]));
    await expect(deleteProject(pid)).rejects.toThrow(RedirectError);
    expect((await db.project.findUniqueOrThrow({ where: { id: pid } })).deletedAt).not.toBeNull();
    const after = await searchAll({ words: ["統合テスト"] });
    expect(after.map((g) => g.kind)).not.toEqual(expect.arrayContaining(["task"]));
    expect(after.map((g) => g.kind)).not.toEqual(expect.arrayContaining(["note"]));
    expect(after.map((g) => g.kind)).not.toEqual(expect.arrayContaining(["activity"]));
  });
});

describe("ユーザー管理", () => {
  it("招待すると仮パスワードが発行され、初回は変更を求められる。自分の管理者権限は外せない", async () => {
    const me = await loginAs("sato@example.com");
    const res = await inviteUser(null, fd({ name: "統合 テスト", email: "itest@example.com", department: "総務", role: "MEMBER" }));
    expect(res?.created?.password).toHaveLength(12);
    const u = await db.user.findUniqueOrThrow({ where: { email: "itest@example.com" } });
    expect(u.mustChangePassword).toBe(true);
    expect((await inviteUser(null, fd({ name: "重複", email: "itest@example.com", department: "", role: "MEMBER" })))?.errors?.email?.[0]).toContain("すでに");
    expect((await changeRole(me.id, "MEMBER")).message).toContain("自分自身");
    expect((await changeRole(u.id, "VIEWER")).message).toBeUndefined();
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).role).toBe("VIEWER");
  });
});

describe("CSV 取込", () => {
  it("行ごとの検証と、見つからない顧客の自動作成", async () => {
    await loginAs("takahashi@example.com");
    const bad = await importRows("customers", [{ name: "サクラ物産株式会社" }, { name: "" }]);
    expect(bad.ok).toBe(false);
    expect(bad.issues.map((i) => i.row)).toEqual([2, 3]);

    const ok = await importRows("projects", [{ name: "取込テスト案件", customer: "取込で作られる商会", status: "進行中", priority: "高", owner: "田中", dueDate: "2026/12/24", amount: "65万" }], { createCustomers: true });
    expect(ok.ok).toBe(true);
    expect(ok.created?.customers).toBe(1);
    const p = await db.project.findFirstOrThrow({ where: { name: "取込テスト案件" }, include: { customer: true, owner: true } });
    expect(p.customer.name).toBe("取込で作られる商会");
    expect(p.status).toBe("ACTIVE");
    expect(p.owner?.email).toBe("tanaka@example.com");
    expect(p.amount).toBe(650000);
    expect(p.dueDate?.toISOString()).toBe("2026-12-24T00:00:00.000Z");
  });
});
