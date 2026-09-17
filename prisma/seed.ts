import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// 今日を基準にした相対日付。動作確認用のデータなので期限切れなども混ぜている
function day(offset: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}
function date(offset: number) {
  const d = day(offset, 0);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function main() {
  await db.session.deleteMany();
  await db.auditLog.deleteMany();
  await db.file.deleteMany();
  await db.note.deleteMany();
  await db.activity.deleteMany();
  await db.task.deleteMany();
  await db.projectMember.deleteMany();
  await db.project.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("password", 10);
  const users = await Promise.all(
    [
      { key: "sato", email: "sato@example.com", name: "佐藤 健太", role: "ADMIN", department: "代表取締役", color: "#1F5F8B", lastLoginAt: day(0, 8, 42) },
      { key: "takahashi", email: "takahashi@example.com", name: "高橋 美咲", role: "MANAGER", department: "営業部 部長", color: "#7A3E9D", lastLoginAt: day(0, 9, 15) },
      { key: "tanaka", email: "tanaka@example.com", name: "田中 大輔", role: "MEMBER", department: "営業部", color: "#1F8A4C", lastLoginAt: day(0, 9, 3) },
      { key: "suzuki", email: "suzuki@example.com", name: "鈴木 あかね", role: "MEMBER", department: "業務推進室", color: "#B7791F", lastLoginAt: day(-1, 17, 20) },
      { key: "yamamoto", email: "yamamoto@example.com", name: "山本 拓也", role: "VIEWER", department: "経理部", color: "#66727F", lastLoginAt: day(-3, 10, 0) },
    ].map(async ({ key, role, ...u }) => [key, await db.user.create({ data: { ...u, role: role as "ADMIN", passwordHash } })] as const),
  ).then(Object.fromEntries);

  const customerRows = [
    ["c1", "C-0001", "サクラ物産株式会社", "サクラブッサン", "CUSTOMER", "卸売", "岡田 浩一", "業務部 部長", "03-5555-0101", "okada@sakura-bussan.example", "東京都中央区日本橋2-3-1", "tanaka", ["重要顧客", "20日締め"], "請求は20日締め。岡田部長はメールより電話のほうが早い。", 410],
    ["c2", "C-0002", "東和エンジニアリング株式会社", "トウワエンジニアリング", "CUSTOMER", "製造", "中村 亮", "総務部", "045-300-2200", "nakamura@towa-eng.example", "神奈川県横浜市西区みなとみらい4-1", "takahashi", ["保守契約"], "稟議は月末の役員会。急ぎの依頼は月初に出すこと。", 380],
    ["c3", "C-0003", "株式会社ミナト運輸", "ミナトウンユ", "CUSTOMER", "物流", "佐々木 淳", "配車課 課長", "03-6666-0303", "sasaki@minato-unyu.example", "東京都江東区新木場1-8", "tanaka", [], "紙の配車表が正。LINEは補助扱い。勝手にツール提案しない。", 300],
    ["c4", "C-0004", "グリーンフィールド不動産株式会社", "グリーンフィールドフドウサン", "CUSTOMER", "不動産", "西村 香", "企画室", "03-7777-0404", "nishimura@greenfield.example", "東京都渋谷区神宮前3-12", "suzuki", ["Web"], "承認者（室長）が出張がち。決裁は早めに回す。", 260],
    ["c5", "C-0005", "株式会社アオイ印刷", "アオイインサツ", "PARTNER", "印刷", "小林 誠", "営業部", "03-8888-0505", "kobayashi@aoi-print.example", "東京都板橋区舟渡2-2", "suzuki", ["印刷発注先"], "校了から納品まで中5営業日。特急は+20%。", 500],
    ["c6", "C-0006", "ノースウインド・デザイン合同会社", "ノースウインドデザイン", "PARTNER", "デザイン", "風間 玲", "代表", "050-1111-0606", "kazama@northwind.example", "北海道札幌市中央区南1条西5", "takahashi", ["デザイン外注"], "", 220],
    ["c7", "C-0007", "医療法人ひだまり会", "ヒダマリカイ", "CUSTOMER", "医療", "松本 恵", "事務長", "042-222-0707", "matsumoto@hidamari.example", "東京都立川市曙町1-4", "takahashi", ["新規"], "", 40],
    ["c8", "C-0008", "株式会社トライデント商事", "トライデントショウジ", "BOTH", "商社", "井上 剛", "第二営業部 部長", "06-4444-0808", "inoue@trident.example", "大阪府大阪市北区中之島3-2", "tanaka", ["展示会"], "", 350],
    ["c9", "C-0009", "ヤマネ建設株式会社", "ヤマネケンセツ", "CUSTOMER", "建設", "山根 徹", "工事部 部長", "048-333-0909", "yamane@yamane-kensetsu.example", "埼玉県さいたま市大宮区桜木町2-5", "tanaka", ["重要顧客"], "現場監督は50代中心。画面の文字は大きめに。", 180],
    ["c10", "C-0010", "コスモ電機株式会社", "コスモデンキ", "CUSTOMER", "電機", "井上 真理", "広報室", "03-9999-1010", "m-inoue@cosmo-denki.example", "東京都品川区大崎1-6", "suzuki", ["印刷物"], "井上さんは校正が細かい。初校前に社内2人チェック。", 150],
    ["c11", "C-0011", "株式会社フジ倉庫", "フジソウコ", "PARTNER", "倉庫", "藤田 良", "営業課", "047-555-1111", "fujita@fuji-souko.example", "千葉県船橋市浜町2-1", "suzuki", ["資材発注先"], "", 90],
  ] as const;
  const customers: Record<string, { id: string }> = {};
  for (const [key, code, name, kana, type, industry, contactName, contactTitle, tel, email, address, owner, tags, note, age] of customerRows) {
    customers[key] = await db.customer.create({
      data: { code, name, kana, type, industry, contactName, contactTitle, tel, email, address, tags: [...tags], note: note || null, ownerId: users[owner].id, createdAt: day(-age, 11) },
    });
  }

  const projectRows = [
    ["p1", "PJ-0001", "在庫管理システム刷新", "c1", "ACTIVE", "HIGH", "tanaka", ["suzuki", "takahashi"], 4800000, -60, 45, "仕入先ごとにバラバラなExcel在庫表を一本化。12月の棚卸し前に稼働させる。バーコード端末はオプション扱い。", ["システム"], -1],
    ["p2", "PJ-0002", "年間保守契約 更新（2027年度）", "c2", "ACTIVE", "MID", "takahashi", [], 1200000, -30, 12, "前年比+5%の条件で提示中。9月末の役員会で稟議予定。", ["保守"], -2],
    ["p3", "PJ-0003", "配車管理アプリ 導入支援", "c3", "HOLD", "MID", "tanaka", ["suzuki"], 2600000, -70, 80, "配車担当3名へのヒアリング完了。予算承認が下期にずれ込み、保留中。", ["アプリ"], -12],
    ["p4", "PJ-0004", "物件紹介サイト リニューアル", "c4", "ACTIVE", "HIGH", "suzuki", ["takahashi"], 1900000, -90, -3, "デザインはノースウインドさんに外注。写真差し替え対応中で公開日を再調整。", ["Web"], -3],
    ["p5", "PJ-0005", "予約受付システム 要件定義", "c7", "LEAD", "MID", "takahashi", [], 900000, -10, 30, "電話予約の取りこぼしが月30件。11月までに要件をまとめたい意向。", ["システム", "新規"], -5],
    ["p6", "PJ-0006", "展示会ブース制作（秋季展）", "c8", "DONE", "MID", "tanaka", ["suzuki"], 1500000, -75, -20, "撤収完了・請求済み。", ["展示会"], -20],
    ["p7", "PJ-0007", "現場日報アプリ 開発", "c9", "ACTIVE", "HIGH", "tanaka", ["suzuki"], 3200000, -20, 100, "現場監督向けの日報＋写真報告アプリ。オフライン保存が要望に上がっている。", ["アプリ"], -2],
    ["p8", "PJ-0008", "販促パンフレット 制作", "c10", "ACTIVE", "MID", "suzuki", [], 450000, -15, 6, "A4・8ページ。印刷はアオイ印刷さん。", ["印刷物"], -1],
    ["p9", "PJ-0009", "社内Wi-Fi 更新工事", "c1", "DONE", "LOW", "takahashi", [], 800000, -100, -45, "工事完了、検収済み。", ["工事"], -45],
    ["p10", "PJ-0010", "倉庫ラベル印刷 発注", "c3", "ACTIVE", "LOW", "suzuki", [], 120000, -5, 2, "ラベル2,000枚。フジ倉庫さん経由で納品。", ["発注"], -1],
    ["p11", "PJ-0011", "採用サイト 制作", "c2", "LEAD", "LOW", "takahashi", [], 1100000, -8, 60, "参考サイトを3件共有済み。提案書を作成中。", ["Web"], -3],
    ["p12", "PJ-0012", "安全大会 資料作成", "c9", "LOST", "LOW", "tanaka", [], 300000, -40, -10, "他社に決定（価格面）。関係は維持。", [], -11],
    ["p13", "PJ-0013", "院内サイネージ 保守", "c7", "ACTIVE", "LOW", "suzuki", [], 240000, -120, 25, "月次点検＋不具合対応。", ["保守"], -21],
  ] as const;
  const projects: Record<string, { id: string; name: string }> = {};
  for (const [key, code, name, cust, status, priority, owner, members, amount, start, due, summary, tags, upd] of projectRows) {
    projects[key] = await db.project.create({
      data: {
        code, name, status, priority, amount, summary, tags: [...tags],
        customerId: customers[cust].id, ownerId: users[owner].id,
        startDate: date(start), dueDate: date(due), createdAt: day(start, 10), updatedAt: day(upd, 15),
        members: { create: members.map((m) => ({ userId: users[m].id })) },
      },
    });
  }

  const taskRows = [
    ["p1", "要件定義書v2を更新（棚卸しフローを反映）", "tanaka", 2, false],
    ["p1", "見積書v3の回答を確認", "tanaka", -1, false],
    ["p1", "バーコード端末のデモ機を手配", "suzuki", 7, false],
    ["p1", "キックオフ議事録を共有", "tanaka", -8, true],
    ["p1", "社内キックオフ（開発体制の確認）", "takahashi", 0, false],
    ["p2", "更新契約書の修正版を送付", "takahashi", 1, false],
    ["p2", "役員会後のフォロー連絡", "takahashi", 14, false],
    ["p3", "ミナト運輸へ再連絡（予算承認の状況）", "tanaka", 27, false],
    ["p4", "物件写真12件の差し替えを確認", "suzuki", -1, false],
    ["p4", "公開日の再設定を先方と合意", "suzuki", 1, false],
    ["p4", "公開前チェックリストを実施", "suzuki", 3, false],
    ["p5", "現状の予約フロー図を作成", "takahashi", 5, false],
    ["p5", "概算見積を作成", "takahashi", 12, false],
    ["p7", "写真添付UIの改善案を作成", "tanaka", 4, false],
    ["p7", "画面設計書v2を提出", "tanaka", 9, false],
    ["p7", "テスト用端末を準備", "suzuki", 20, false],
    ["p8", "初校の戻しを受領", "suzuki", 2, false],
    ["p8", "再校を送付", "suzuki", 4, false],
    ["p8", "校了・入稿", "suzuki", 6, false],
    ["p10", "ラベル納品の検品", "suzuki", 2, false],
    ["p11", "採用サイトの提案書を作成", "takahashi", 10, false],
    ["p13", "サイネージ月次点検の報告書を送付", "suzuki", -4, false],
    ["p6", "請求書を送付", "tanaka", -20, true],
    ["p9", "検収書を受領", "takahashi", -45, true],
    [null, "来期の営業目標シートを更新", "takahashi", null, false],
  ] as const;
  for (const [proj, title, assignee, due, done] of taskRows) {
    await db.task.create({
      data: {
        title, done,
        projectId: proj ? projects[proj].id : null,
        assigneeId: users[assignee].id,
        createdById: users[assignee].id,
        dueDate: due === null ? null : date(due),
        doneAt: done ? day(due ?? 0, 17) : null,
        createdAt: day(-10),
      },
    });
  }

  const activityRows = [
    ["p1", null, "tanaka", "VISIT", -1, 15, 30, "岡田部長と現行Excelの棚卸しフローを確認。仕入先ごとにシートが分かれていて、月末の突合に2日かかっているとのこと。要件定義書v2に反映する。"],
    ["p1", null, "tanaka", "MAIL", -4, 11, 0, "見積書v3を送付。オプション（バーコード端末3台）は別枠で提示。"],
    ["p1", null, "takahashi", "MEETING", -9, 10, 0, "先方より来社、キックオフ。導入目標は12月の棚卸し前。担当は岡田部長＋業務課2名。"],
    ["p1", null, "tanaka", "CALL", -18, 14, 0, "初回ヒアリングの日程調整。"],
    ["p1", null, "suzuki", "MEMO", 0, 9, 20, "デモ機の在庫をメーカーに確認中。今週中に回答予定。"],
    ["p2", null, "takahashi", "MAIL", -2, 9, 40, "更新契約書ドラフトを送付。前年比+5%の条件で打診中。"],
    ["p2", null, "takahashi", "CALL", -7, 16, 10, "総務の中村さんより、稟議は9月末の役員会にかけるとのこと。"],
    ["p2", null, "takahashi", "MEMO", 0, 9, 50, "契約書の修正箇所（第7条・支払条件）を法務にチェック依頼。"],
    ["p3", null, "tanaka", "CALL", -12, 13, 0, "予算承認が下期にずれ込む見込み。10月中旬に再度連絡する約束。"],
    ["p3", null, "tanaka", "VISIT", -30, 10, 0, "配車担当3名にヒアリング。紙の配車表とLINEでの連絡が混在。"],
    ["p4", null, "suzuki", "MAIL", -3, 17, 45, "物件写真の差し替え依頼（12件）を受領。ノースウインドさんへ修正依頼済み。"],
    ["p4", null, "suzuki", "MEMO", -8, 12, 0, "公開日を再調整中。先方の承認者（室長）が出張中で決裁が止まっている。"],
    ["p5", null, "takahashi", "VISIT", -5, 14, 0, "事務長と面談。電話予約の取りこぼしが月30件ほどあるとのこと。11月までに要件をまとめたい意向。"],
    ["p6", null, "tanaka", "MEMO", -25, 18, 0, "ブース撤収完了。請求書送付済み。"],
    ["p7", null, "tanaka", "MEETING", -2, 10, 30, "現場監督2名に試作画面を確認してもらった。写真添付の操作が分かりづらいとの指摘。"],
    ["p7", null, "tanaka", "MAIL", -6, 9, 0, "画面設計書v1を共有。"],
    ["p7", null, "takahashi", "VISIT", -14, 11, 0, "契約締結。山根部長より「現場が使えるものを」と念押しあり。"],
    ["p8", null, "suzuki", "MAIL", -1, 10, 15, "初校を送付。戻しの期日は2日後で合意。"],
    ["p8", null, "suzuki", "MEETING", -10, 15, 0, "原稿と写真素材を受領。"],
    ["p9", null, "takahashi", "MEMO", -50, 17, 0, "工事完了、検収済み。"],
    ["p10", null, "suzuki", "MAIL", -1, 11, 20, "フジ倉庫さんへラベル2,000枚を発注。納品予定は2日後。"],
    ["p11", null, "takahashi", "MAIL", -3, 13, 0, "採用サイトの参考サイト3件を送付。"],
    ["p12", null, "tanaka", "MEMO", -11, 9, 30, "他社に決定。価格面とのこと。次回に向けて関係は維持。"],
    ["p13", null, "suzuki", "CALL", -21, 14, 20, "サイネージの表示不具合の問い合わせ。再起動で復旧。"],
    [null, "c8", "takahashi", "CALL", -15, 16, 0, "新規部門（第三営業部）の紹介を受ける。来月あいさつに行く。"],
    [null, "c5", "suzuki", "MAIL", -6, 10, 0, "年末の繁忙期スケジュールを確認。12月は特急不可とのこと。"],
  ] as const;
  for (const [proj, cust, user, type, d, h, m, body] of activityRows) {
    await db.activity.create({
      data: {
        type, body,
        projectId: proj ? projects[proj].id : null,
        customerId: cust ? customers[cust].id : null,
        userId: users[user].id,
        occurredAt: day(d, h, m),
      },
    });
  }

  const noteRows = [
    ["【引き継ぎ】ミナト運輸さま（田中→鈴木）", "HANDOVER", "tanaka", -12, true, "p3", "10月から鈴木さんに窓口をお願いします。\n・窓口：配車課 佐々木課長（電話が早い。メールは翌日返信）\n・現状：予算承認が下期にずれ込み中。10月中旬に再連絡の約束\n・注意：紙の配車表が正で、LINEは補助。勝手にツール提案しない\n・見積：v2（¥2,600,000）が最新。v1は破棄済み"],
    ["請求書の送付ルール（全社共通）", "RULE", "sato", -40, true, null, "・月末締め、翌月末払いが基本\n・サクラ物産さまのみ20日締め\n・PDFは案件のファイルに保存してから送付\n・件名は「【請求書】案件名_年月」で統一"],
    ["取引先へ発注するときのチェックリスト", "RULE", "suzuki", -25, false, null, "1. 案件に紐づけて発注メモを残す\n2. 納品予定日をタスクに登録する\n3. 納品後は検品タスクを完了にして、納品書をファイルに追加"],
    ["年末年始の営業日と対応窓口", "MEMO", "takahashi", -3, false, null, "12/27〜1/4は休業。緊急連絡は代表携帯へ。\n保守契約先には12/10までに案内メールを送る（担当：高橋）"],
    ["ヤマネ建設さま 現場アプリの要望メモ", "MEMO", "tanaka", -2, false, "p7", "・写真は1日30枚くらい撮る。まとめて添付したい\n・電波の弱い現場がある → オフライン保存が欲しい\n・監督は50代中心。文字は大きめ"],
    ["【引き継ぎ】コスモ電機さま 担当交代の経緯", "HANDOVER", "takahashi", -60, false, null, "前任の退職に伴い鈴木さんへ。\n先方の広報 井上さんは校正が細かいので、初校前に社内で2人チェックすること。\n過去の制作物はファイルの「コスモ電機」で検索。"],
  ] as const;
  for (const [title, category, author, d, pinned, proj, body] of noteRows) {
    await db.note.create({
      data: { title, category, body, pinned, authorId: users[author].id, projectId: proj ? projects[proj].id : null, createdAt: day(d, 14), updatedAt: day(d, 14) },
    });
  }

  const fileRows = [
    ["見積書_サクラ物産_在庫管理_v3.xlsx", 122880, 2, "p1", "c1", "tanaka", -12],
    ["見積書_サクラ物産_在庫管理_v3.xlsx", 131072, 3, "p1", "c1", "tanaka", -4],
    ["要件定義書_在庫管理システム.docx", 862208, 2, "p1", "c1", "tanaka", -1],
    ["キックオフ議事録.pdf", 215040, 1, "p1", "c1", "takahashi", -9],
    ["保守契約書_東和エンジニアリング_2027.pdf", 1258291, 1, "p2", "c2", "takahashi", -2],
    ["配車ヒアリングメモ.docx", 98304, 1, "p3", "c3", "tanaka", -30],
    ["物件写真_差し替え分.zip", 50331648, 1, "p4", "c4", "suzuki", -3],
    ["パンフレット_初校.pdf", 6710886, 1, "p8", "c10", "suzuki", -1],
    ["画面設計書_現場日報.pdf", 3250585, 1, "p7", "c9", "tanaka", -6],
    ["契約書_ヤマネ建設_現場日報アプリ.pdf", 1003520, 1, "p7", "c9", "takahashi", -14],
    ["展示会ブース_完成写真.jpg", 2306867, 1, "p6", "c8", "tanaka", -25],
    ["発注書_フジ倉庫_ラベル2000枚.pdf", 90112, 1, "p10", "c3", "suzuki", -1],
    ["会社ロゴ_サクラ物産.ai", 1887436, 1, null, "c1", "tanaka", -50],
  ] as const;
  // ダウンロードが動くように、中身はダミーのテキストで実ファイルも置いておく
  const storageDir = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
  await mkdir(path.join(storageDir, "seed"), { recursive: true });
  for (const [name, size, version, proj, cust, uploader, d] of fileRows) {
    const storagePath = `seed/v${version}_${name}`;
    await writeFile(path.join(storageDir, storagePath), `サンプルファイル: ${name}（v${version}）
実際の運用ではここにアップロードされた本体が入ります。
`);
    await db.file.create({
      data: {
        name, size, version,
        storagePath,
        projectId: proj ? projects[proj].id : null,
        customerId: customers[cust].id,
        uploaderId: users[uploader].id,
        createdAt: day(d, 16),
      },
    });
  }

  const auditRows = [
    [0, 9, 50, "takahashi", "CREATE", "activity", "p2", "年間保守契約 更新（2027年度）", [{ field: "メモ", from: "—", to: "契約書の修正箇所（第7条・支払条件）を法務に…" }]],
    [-1, 15, 35, "tanaka", "CREATE", "file", "p1", "在庫管理システム刷新", [{ field: "ファイル", from: "v1", to: "要件定義書_在庫管理システム.docx v2" }]],
    [-2, 9, 45, "takahashi", "UPDATE", "project", "p2", "年間保守契約 更新（2027年度）", [{ field: "金額", from: "¥1,150,000", to: "¥1,200,000" }]],
    [-6, 10, 0, "sato", "ROLE", "user", null, "山本 拓也", [{ field: "ロール", from: "一般", to: "閲覧のみ" }]],
    [-9, 10, 30, "takahashi", "STATUS", "project", "p1", "在庫管理システム刷新", [{ field: "ステータス", from: "見込み", to: "進行中" }]],
    [-12, 13, 10, "tanaka", "STATUS", "project", "p3", "配車管理アプリ 導入支援", [{ field: "ステータス", from: "進行中", to: "保留" }]],
    [-20, 18, 5, "tanaka", "STATUS", "project", "p6", "展示会ブース制作（秋季展）", [{ field: "ステータス", from: "進行中", to: "完了" }]],
    [-22, 14, 0, "takahashi", "IMPORT", "system", null, "顧客・取引先 6件", [{ field: "件数", from: "—", to: "6件" }]],
  ] as const;
  for (const [d, h, m, user, action, targetType, proj, targetLabel, changes] of auditRows) {
    await db.auditLog.create({
      data: {
        action, targetType, targetLabel,
        targetId: proj ? projects[proj].id : null,
        userId: users[user].id,
        changes: [...changes],
        createdAt: day(d, h, m),
      },
    });
  }

  // 採番シーケンスを投入済みデータの続きに合わせる
  await db.$queryRaw`SELECT setval('customer_code_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)), 0) + 1 FROM customers), false)`;
  await db.$queryRaw`SELECT setval('project_code_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)), 0) + 1 FROM projects), false)`;

  console.log("seed 完了: users=%d customers=%d projects=%d", Object.keys(users).length, customerRows.length, projectRows.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
