-- 日本語の部分一致検索を速くするため pg_trgm を使う
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS customers_name_trgm ON customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_kana_trgm ON customers USING gin (kana gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_contact_trgm ON customers USING gin ("contactName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS projects_name_trgm ON projects USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS projects_summary_trgm ON projects USING gin (summary gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS notes_title_trgm ON notes USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS notes_body_trgm ON notes USING gin (body gin_trgm_ops);
CREATE INDEX IF NOT EXISTS files_name_trgm ON files USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS activities_body_trgm ON activities USING gin (body gin_trgm_ops);
