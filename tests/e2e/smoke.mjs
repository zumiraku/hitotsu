// 起動中のアプリに対して主要な画面を一通り操作する。
// 使い方: BASE_URL=http://localhost:3000 npm run test:e2e
// 実行にはローカルの Chrome（または Edge）が必要。ログインには seed のアカウントを使う。
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const channel = process.env.BROWSER_CHANNEL ?? "chrome";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "OK " : "NG "} ${name}${detail ? "  " + detail : ""}`);
};

const browser = await chromium.launch({ channel, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

try {
  await page.goto(base + "/");
  check("未ログインはログイン画面へ", new URL(page.url()).pathname === "/login");

  await page.fill("#email", "takahashi@example.com");
  await page.fill("#password", "password");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname === "/");
  check("ログインしてホーム", await page.locator("text=本日の状況").count() > 0);

  await page.goto(base + "/customers");
  check("顧客一覧", (await page.locator("tbody tr").count()) > 0);
  await page.click("tbody a");
  await page.waitForURL(/\/customers\/[a-z0-9]{10,}/);
  check("顧客詳細", (await page.locator("h1").count()) === 1);

  await page.goto(base + "/projects?view=board");
  check("案件ボード", (await page.locator(".board > div").count()) === 5);

  await page.goto(base + "/tasks");
  const boxes = page.locator('tbody input[type="checkbox"]');
  const countBefore = await boxes.count();
  await boxes.first().click();
  await page.waitForTimeout(800);
  await page.reload();
  const countAfter = await page.locator('tbody input[type="checkbox"]').count();
  check("タスクの完了切り替え", countBefore > 0 && countAfter === countBefore - 1, `${countBefore} -> ${countAfter}`);

  await page.goto(base + "/search?q=" + encodeURIComponent("期限切れ"));
  check("自然文検索", (await page.locator("section").count()) > 0);

  await page.goto(base + "/notes");
  check("社内メモ", (await page.locator("article").count()) > 0);

  await page.goto(base + "/files");
  check("ファイル一覧", (await page.locator("tbody tr").count()) > 0);

  await page.goto(base + "/audit");
  check("変更履歴（マネージャー）", (await page.locator("tbody tr").count()) > 0);

  await page.goto(base + "/data");
  check("データ入出力", (await page.locator("text=CSV出力").count()) > 0);

  await page.click("text=ログアウト");
  await page.waitForURL(/\/login/);
  check("ログアウト", true);

  check("ページ内で JavaScript エラーなし", pageErrors.length === 0, pageErrors.join(" / "));
} catch (e) {
  check("実行中に例外", false, String(e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 件成功`);
process.exit(failed.length ? 1 : 0);
