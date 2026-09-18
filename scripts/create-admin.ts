// 最初の管理者を作る。使い方:
//   npx tsx scripts/create-admin.ts admin "管理者 太郎" "仮パスワード"
//   （docker compose run --rm migrate npx tsx scripts/create-admin.ts ...）
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const [rawId, name, password] = process.argv.slice(2);
if (!rawId || !name || !password) {
  console.error("使い方: npx tsx scripts/create-admin.ts <ログインID> <名前> <仮パスワード>");
  process.exit(1);
}
const loginId = rawId.toLowerCase();
if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(loginId)) {
  console.error("ログインIDは半角の英数字と . _ - で、3〜30文字にしてください");
  process.exit(1);
}
if (password.length < 8) {
  console.error("仮パスワードは8文字以上にしてください");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const existing = await db.user.findUnique({ where: { loginId } });
  if (existing) {
    console.error(`${loginId} はすでに登録されています`);
    process.exit(1);
  }
  await db.user.create({
    data: { loginId, name, role: "ADMIN", passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true, color: "#1F5F8B" },
  });
  console.log(`管理者を作成しました: ${loginId}（初回ログインでパスワード変更を求められます）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
