import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ヒトツ 業務管理システム", template: "%s | ヒトツ 業務管理システム" },
  description: "顧客・案件・タスク・対応履歴を管理する社内システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
