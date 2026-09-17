import { beforeEach, describe, expect, it } from "vitest";
import { changePassword, login, logout } from "@/actions/auth";
import { sessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RedirectError, fd, loginAs, logoutAll } from "./helpers";

describe("ログイン", () => {
  beforeEach(() => logoutAll());

  it("正しいメールとパスワードでセッションが作られ、変更履歴に残る", async () => {
    await expect(login(null, fd({ email: "TAKAHASHI@example.com", password: "password", next: "/projects" }))).rejects.toThrow("NEXT_REDIRECT:/projects");
    const me = await sessionUser();
    expect(me?.email).toBe("takahashi@example.com");
    const log = await db.auditLog.findFirst({ where: { action: "LOGIN", targetId: me!.id }, orderBy: { createdAt: "desc" } });
    expect(log).not.toBeNull();
  });

  it("間違ったパスワードは同じメッセージで弾き、セッションは作られない", async () => {
    const res = await login(null, fd({ email: "takahashi@example.com", password: "wrong", next: "" }));
    expect(res?.message).toBe("メールアドレスまたはパスワードが違います");
    const unknown = await login(null, fd({ email: "nobody@example.com", password: "password", next: "" }));
    expect(unknown?.message).toBe(res?.message);
    expect(await sessionUser()).toBeNull();
  });

  it("外部サイトへの next は無視して / に戻す", async () => {
    await expect(login(null, fd({ email: "sato@example.com", password: "password", next: "//evil.example" }))).rejects.toThrow("NEXT_REDIRECT:/");
  });

  it("無効化されたユーザーはログインできない", async () => {
    const u = await db.user.findUniqueOrThrow({ where: { email: "yamamoto@example.com" } });
    await db.user.update({ where: { id: u.id }, data: { isActive: false } });
    try {
      const res = await login(null, fd({ email: "yamamoto@example.com", password: "password", next: "" }));
      expect(res?.message).toBeTruthy();
    } finally {
      await db.user.update({ where: { id: u.id }, data: { isActive: true } });
    }
  });

  it("ログアウトでセッションが消える", async () => {
    await loginAs("tanaka@example.com");
    expect(await sessionUser()).not.toBeNull();
    await expect(logout()).rejects.toThrow(RedirectError);
    expect(await sessionUser()).toBeNull();
  });
});

describe("パスワード変更", () => {
  it("今のパスワードが違えば拒否、8文字未満も拒否、成功すると新しいものでログインできる", async () => {
    const me = await loginAs("suzuki@example.com");
    const wrong = await changePassword(null, fd({ current: "nope", password: "newpassword1", confirm: "newpassword1" }));
    expect(wrong?.errors?.current?.[0]).toBe("今のパスワードが違います");
    const short = await changePassword(null, fd({ current: "password", password: "short", confirm: "short" }));
    expect(short?.errors?.password?.[0]).toContain("8文字以上");
    const mismatch = await changePassword(null, fd({ current: "password", password: "newpassword1", confirm: "newpassword2" }));
    expect(mismatch?.errors?.confirm?.[0]).toContain("一致");

    const ok = await changePassword(null, fd({ current: "password", password: "newpassword1", confirm: "newpassword1" }));
    expect(ok?.ok).toBe(true);
    logoutAll();
    await expect(login(null, fd({ email: "suzuki@example.com", password: "newpassword1", next: "" }))).rejects.toThrow(RedirectError);
    // 元に戻す
    await changePassword(null, fd({ current: "newpassword1", password: "password", confirm: "password" }));
    expect((await db.user.findUniqueOrThrow({ where: { id: me.id } })).mustChangePassword).toBe(false);
  });
});
