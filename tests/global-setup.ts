import { execSync } from "node:child_process";

// 統合テストはテスト用 DB を毎回 seed の状態に戻してから走らせる
export default function setup() {
  execSync("npx dotenv -e .env.test -- prisma db seed", { stdio: "inherit", shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh" });
}
