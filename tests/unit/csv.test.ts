import { describe, expect, it } from "vitest";
import { autoMap, parseCsv, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("カンマ区切りと引用符を読める", () => {
    const rows = parseCsv('会社名,メモ\n"株式会社A, B","改行\n含む"\nC社,"引用 ""符"""\n');
    expect(rows).toEqual([
      ["会社名", "メモ"],
      ["株式会社A, B", "改行\n含む"],
      ["C社", '引用 "符"'],
    ]);
  });

  it("Excel から貼り付けたタブ区切りも読める", () => {
    const rows = parseCsv("案件名\t顧客名\t金額\r\n新店舗\tハルカゼ商会\t65万\r\n");
    expect(rows).toEqual([
      ["案件名", "顧客名", "金額"],
      ["新店舗", "ハルカゼ商会", "65万"],
    ]);
  });

  it("BOM と空行を無視する", () => {
    const rows = parseCsv("﻿a,b\n\n1,2\n   ,  \n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("toCsv", () => {
  it("カンマ・引用符・改行を含む値を引用する", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"'], ["line\nbreak", 12]])).toBe('a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",12\r\n');
  });
});

describe("autoMap", () => {
  it("見出しの別名から取り込み先を推測する", () => {
    expect(autoMap("customers", ["取引先名", "TEL", "営業担当", "備考", "不明な列"])).toEqual(["name", "tel", "owner", "note", null]);
  });

  it("同じ取り込み先を二重に割り当てない", () => {
    expect(autoMap("customers", ["会社名", "顧客名"])).toEqual(["name", null]);
  });

  it("空白や大文字小文字の違いを吸収する", () => {
    expect(autoMap("tasks", ["タスク 名", "Due", "担当者"])).toEqual(["title", "dueDate", "assignee"]);
  });
});
