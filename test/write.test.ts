import { describe, expect, it } from "vitest";
import { decodeBytes, encodeCp1252 } from "../src/csv.js";
import { type BatchHeader, type BatchRow, validateExtf, writeBuchungsstapel } from "../src/extf.js";
import { formatFinding, messages } from "../src/messages.js";

const header: BatchHeader = {
  berater: "29098",
  mandant: "55003",
  wjStart: "20250101",
  skl: 4,
  from: "20250601",
  to: "20250630",
  label: "Shop 06/2025",
  skr: "03",
  created: new Date(2025, 6, 2, 8, 15, 0, 0),
};

const rows: BatchRow[] = [
  { amount: 11900, side: "S", account: "1360", contra: "8400", day: 2, month: 6, beleg1: "RE2025-114", text: "Bestellung 114" },
  { amount: 4990, side: "S", account: "1360", contra: "8400", day: 3, month: 6, beleg1: "RE2025-115", text: "Bestellung 115" },
  { amount: 2380, side: "S", account: "1360", contra: "8400", day: 5, month: 6, beleg1: "RE2025-116", text: "Bestellung 116" },
  { amount: 5950, side: "S", account: "1360", contra: "8400", key: "3", day: 9, month: 6, beleg1: "RE2025-117", text: "Bestellung 117" },
  { amount: 1785, side: "S", account: "1360", contra: "8400", day: 12, month: 6, beleg1: "RE2025-118", text: "Bürobedarf" },
  { amount: 2900, side: "H", account: "1360", contra: "4970", day: 30, month: 6, beleg1: "GEB2025-06", text: "Gebühren Juni" },
];

describe("writeBuchungsstapel", () => {
  it("writes files the validator accepts, apart from the deliberate BU key on an AM account", () => {
    const report = validateExtf(decodeBytes(encodeCp1252(writeBuchungsstapel(header, rows))));
    expect(report.findings.map((f) => [f.line, f.code])).toEqual([[6, "bu-automatic"]]);
    expect(report.rows).toBe(6);
  });

  it("names one mistake per line after the first booking", () => {
    const lines = writeBuchungsstapel(header, rows.slice(0, 5)).split("\r\n");
    lines[3] = lines[3].replace("49,90", "49.90");
    lines[4] = lines[4].replace(";0506;", ";506;");
    lines[6] = lines[6].replace('"RE2025-118"', '"RE 2025.118"');
    const report = validateExtf(decodeBytes(encodeCp1252(lines.join("\r\n"))));
    expect(report.findings.map((f) => [f.line, f.code])).toEqual([
      [4, "amount-dot"],
      [5, "date-leading-zero"],
      [6, "bu-automatic"],
      [7, "beleg1-chars"],
    ]);
  });
});

describe("formatFinding", () => {
  it("has a message for every code in both languages", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.de).sort());
  });

  it("fills placeholders and shows dates per language", () => {
    const finding = {
      code: "date-outside-batch",
      severity: "warning",
      line: 5,
      field: 10,
      fieldName: "Belegdatum",
      value: "0107",
      params: { from: "20250601", to: "20250630" },
    } as const;
    expect(formatFinding(finding, "de")).toContain("(01.06.2025 bis 30.06.2025)");
    expect(formatFinding(finding, "en")).toContain("01/06/2025");
    expect(formatFinding(finding, "en")).not.toMatch(/\{\w+\}/);
  });
});
