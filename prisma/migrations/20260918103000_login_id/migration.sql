-- ログインをメールアドレスからログインIDに変更（データはそのまま引き継ぐ）
ALTER TABLE "users" RENAME COLUMN "email" TO "loginId";
ALTER INDEX "users_email_key" RENAME TO "users_loginId_key";
