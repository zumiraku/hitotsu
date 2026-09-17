import type { Metadata } from "next";
import { BIZ_UDPGothic, Zen_Kaku_Gothic_New } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const body = BIZ_UDPGothic({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const display = Zen_Kaku_Gothic_New({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ヒトツ 業務管理", template: "%s | ヒトツ" },
  description: "顧客・案件・タスク・対応履歴をひとつにまとめる業務管理システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full">
        {/* ログインはステージ7で入れる。それまでは固定ユーザー表示 */}
        <AppShell userName="高橋 美咲">{children}</AppShell>
      </body>
    </html>
  );
}
