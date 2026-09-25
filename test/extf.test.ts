import { describe, expect, it } from "vitest";
import { BUCHUNGSSTAPEL_COLUMNS, DEBKRED_COLUMNS } from "../src/columns.js";
import { decodeBytes, encodeCp1252 } from "../src/csv.js";
import {
  type FindingCode,
  validateExtf,
  validIban,
  writeBuchungsstapel,
} from "../src/extf.js";

// Header lines as printed in DATEV's format description (developer.datev.de).
const BATCH_HEADER =
  '"EXTF";700;21;"Buchungsstapel";13;20240130140440439;;"RE";"";"";29098;55003;20240101;4;20240101;20240831;"Buchungsstapel";"WD";1;0;0;"EUR";;"";;;"03";;;"";""';
const DEBKRED_HEADER =
  '"EXTF";700;16;"Debitoren/Kreditoren";5;20240130140659583;;"RE";"";"";29098;55003;20240101;4;;;"";"";;;;"";;"";;;"03";;;"";""';

/** A booking line with 125 fields; `fields` overrides by 1-based position. */
function booking(fields: Record<number, string>): string {
  const cells = new Array(125).fill("");
  Object.assign(cells, { 0: "100,00", 1: '"S"', 6: "1200", 7: "8400", 9: "3101" });
  for (const [field, value] of Object.entries(fields)) cells[Number(field) - 1] = value;
  return cells.join(";");
}

function person(fields: Record<number, string>): string {
  const cells = new Array(254).fill("");
  Object.assign(cells, { 0: "10000", 1: '"Möbel Test GmbH"', 6: '"2"' });
  for (const [field, value] of Object.entries(fields)) cells[Number(field) - 1] = value;
  return cells.join(";");
}

const file = (lines: string[]) => lines.join("\r\n");
const batch = (...rows: string[]) => file([BATCH_HEADER, BUCHUNGSSTAPEL_COLUMNS.join(";"), ...rows]);

const codes = (text: string, encoding: "windows-1252" | "utf-8" = "windows-1252") =>
  validateExtf({ text, encoding, nonAscii: /[^\x00-\x7f]/.test(text) }).findings.map((f) => f.code);

describe("validateExtf, file and header", () => {
  it("accepts a clean batch", () => {
    const report = validateExtf({ text: batch(booking({})), encoding: "windows-1252", nonAscii: true });
    expect(report.findings).toEqual([]);
    expect(report.rows).toBe(1);
    expect(report.header).toMatchObject({ category: "buchungsstapel", berater: "29098", skl: 4, skr: "03" });
  });

  it("names a file that starts with the column headings", () => {
    expect(codes(file([BUCHUNGSSTAPEL_COLUMNS.join(";"), booking({})]))).toEqual(["headings-first"]);
    expect(codes("Datum;Betrag\n1;2")).toEqual(["not-extf"]);
    expect(codes('"EXTF",700,21')).toEqual(["wrong-delimiter"]);
    expect(codes("")).toEqual(["empty"]);
  });

  it("warns about UTF-8 without a BOM", () => {
    expect(codes(batch(booking({ 14: '"Bürobedarf"' })), "utf-8")).toEqual(["utf8-without-bom"]);
  });

  it.each([
    [BATCH_HEADER.replace(";29098;", ";999;"), "header-berater"],
    [BATCH_HEADER.replace(";55003;", ";123456;"), "header-mandant"],
    [BATCH_HEADER.replace(";4;20240101;", ";9;20240101;"), "header-skl"],
    [BATCH_HEADER.replace("20240831", "20250131"), "header-dates-year"],
    [BATCH_HEADER.replace(";20240101;20240831;", ";20240301;20240201;"), "header-dates-order"],
    [BATCH_HEADER.replace(";20240101;4;20240101;", ";20240401;4;20240101;"), "header-before-wj"],
    [BATCH_HEADER.replace('"Buchungsstapel";13', '"Buchungsstapel";9'), "header-format-version"],
    [BATCH_HEADER.replace('"Buchungsstapel";13', '"Buchungsstapel";12'), "header-format-version-old"],
    [BATCH_HEADER.replace(';21;"Buchungsstapel"', ';21;"Buchungen"'), "header-format-name"],
    [BATCH_HEADER.replace(";700;", ";600;"), "header-version"],
  ] as [string, FindingCode][])("flags %s as %s", (header, code) => {
    const found = codes(file([header, BUCHUNGSSTAPEL_COLUMNS.join(";")]));
    expect(found).toContain(code);
  });

  it("warns about a short or shifted heading row", () => {
    const headings = [...BUCHUNGSSTAPEL_COLUMNS];
    headings.splice(3, 1);
    expect(codes(file([BATCH_HEADER, headings.join(";")]))).toEqual(["headings-count", "headings-differ", "no-rows"]);
  });
});

describe("validateExtf, bookings", () => {
  it.each([
    [{ 1: "" }, "amount-missing"],
    [{ 1: "100.00" }, "amount-dot"],
    [{ 1: "-100,00" }, "amount-negative"],
    [{ 1: "1.234,56" }, "amount-thousands"],
    [{ 1: "0,00" }, "amount-zero"],
    [{ 1: "64083" }, "amount-no-decimals"],
    [{ 2: '"X"' }, "side"],
    [{ 7: "" }, "account-dragged"],
    [{ 8: "" }, "account-missing"],
    [{ 8: "84OO" }, "account-format"],
    [{ 8: "840000" }, "account-length"],
    [{ 8: "1200" }, "account-same"],
    [{ 9: '"3a"' }, "bu-format"],
    [{ 9: '"3"' }, "bu-automatic"],
    [{ 10: "31.01.2024" }, "date-full"],
    [{ 10: "501" }, "date-leading-zero"],
    [{ 10: "3102" }, "date-invalid"],
    [{ 10: "0110" }, "date-outside-batch"],
    [{ 11: '"RE 2024.01"' }, "beleg1-chars"],
    [{ 11: '"txn_123"' }, "beleg1-underscore"],
    [{ 11: `"${"A".repeat(37)}"` }, "beleg1-length"],
    [{ 14: `"${"x".repeat(61)}"` }, "text-length"],
    [{ 14: "Unquoted" }, "text-unquoted"],
    [{ 40: '"123"' }, "eu-vat-id"],
    [{ 115: "01022024" }, "service-date-period"],
    [{ 120: '"Deutschland"' }, "country"],
  ] as [Record<number, string>, FindingCode][])("%o -> %s", (fields, code) => {
    expect(codes(batch(booking(fields)))).toEqual([code]);
  });

  it("spots an unquoted semicolon by the field count", () => {
    const row = booking({ 14: "Porto; Versand" });
    expect(codes(batch(row))).toContain("row-too-many-fields");
  });

  it("leaves unchecked formats at the header", () => {
    const header = BATCH_HEADER.replace(';21;"Buchungsstapel";13', ';20;"Kontenbeschriftungen";3');
    expect(codes(file([header, "Konto;Kontenbeschriftung", "8400;Erlöse"]))).toEqual(["header-category-unchecked"]);
  });
});

describe("validateExtf, Debitoren/Kreditoren", () => {
  const master = (...rows: string[]) => file([DEBKRED_HEADER, DEBKRED_COLUMNS.join(";"), ...rows]);

  it("accepts a clean record", () => {
    expect(codes(master(person({ 45: '"DE49100102220002222222"' })))).toEqual([]);
  });

  it.each([
    [{ 1: "1000" }, "person-length"],
    [{ 1: "01000" }, "person-range"],
    [{ 7: '"5"' }, "addressee-type"],
    [{ 7: '"1"' }, "name-missing"],
    [{ 9: '"DE"', 10: '"DE133546770"' }, "eu-vat-prefix"],
    [{ 18: '"D-90482"' }, "postcode"],
    [{ 45: '"DE49100102220002222223"' }, "iban"],
  ] as [Record<number, string>, FindingCode][])("%o -> %s", (fields, code) => {
    expect(codes(master(person(fields)))).toEqual([code]);
  });

  it("warns about duplicate accounts", () => {
    expect(codes(master(person({}), person({})))).toEqual(["person-duplicate"]);
  });
});

describe("validIban", () => {
  it("checks the ISO checksum", () => {
    expect(validIban("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(validIban("DE89370400440532013001")).toBe(false);
  });
});

describe("writeBuchungsstapel", () => {
  const text = writeBuchungsstapel(
    {
      berater: "29098",
      mandant: "55003",
      wjStart: "20250101",
      skl: 4,
      from: "20250601",
      to: "20250630",
      label: "PayPal 06/2025",
      skr: "03",
      created: new Date(2025, 6, 1, 9, 30, 0, 5),
    },
    [
      { amount: 6389, side: "S", account: "1210", contra: "8400", day: 2, month: 6, beleg1: "1AB23", text: "Erika Müller; Bestellung \"42\"" },
      { amount: 194, side: "H", account: "1210", contra: "4970", day: 2, month: 6, beleg1: "txn_1Abc.9", text: "Gebühr\nPayPal" },
    ],
  );

  it("writes a file the validator accepts without findings", () => {
    const bytes = encodeCp1252(text);
    const report = validateExtf(decodeBytes(bytes));
    expect(report.findings).toEqual([]);
    expect(report.rows).toBe(2);
  });

  it("writes the fields DATEV expects", () => {
    const [header, , first, second] = text.split("\r\n");
    expect(header).toBe(
      '"EXTF";700;21;"Buchungsstapel";13;20250701093000005;;"RE";"";"";29098;55003;20250101;4;20250601;20250630;"PayPal 06/2025";"";1;0;0;"EUR";;"";;;"03";;;"";""',
    );
    expect(first.split(";").slice(0, 11)).toEqual(['63,89', '"S"', '"EUR"', "", "", "", "1210", "8400", '""', "0206", '"1AB23"']);
    expect(first).toContain('"Erika Müller; Bestellung ""42"""');
    expect(second).toContain('"txn1Abc9"');
    expect(second).toContain('"Gebühr PayPal"');
  });
});
