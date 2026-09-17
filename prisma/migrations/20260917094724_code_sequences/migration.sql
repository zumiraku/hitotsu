-- 顧客コード・案件コードの採番用シーケンス
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS project_code_seq START WITH 1;

-- 既存データがある場合は最大値の続きから採番する
SELECT setval('customer_code_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)) FROM customers), 0) + 1, false);
SELECT setval('project_code_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)) FROM projects), 0) + 1, false);
