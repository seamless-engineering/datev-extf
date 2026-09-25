/**
 * DATEV-Format (EXTF) checks and writer. Files written by
 * `writeBuchungsstapel` must pass `validateExtf` without a single finding.
 *
 * Every rule comes from DATEV's own material: the field regexes on
 * developer.datev.de ("DATEV-Format", Formatbeschreibung), the field
 * definitions shipped with DATEV's "DATEV-Format Prüfprogramm" and the
 * import messages (#REW...) documented in the DATEV Hilfe-Center. Where those
 * sources contradict each other (Belegfeld 2 length, BU-Schlüssel length,
 * amounts without decimals), the check is a warning, not an error.
 *
 * The validator returns codes and values only. `formatFinding` in messages.ts
 * turns them into German or English text.
 */

import { BUCHUNGSSTAPEL_COLUMN_COUNT, BUCHUNGSSTAPEL_COLUMNS, DEBKRED_COLUMNS } from "./columns.js";
import { type CsvRow, type Decoded, parseCsv, quote } from "./csv.js";

export type Severity = "error" | "warning";

export type FindingCode =
  // File
  | "empty"
  | "not-extf"
  | "headings-first"
  | "wrong-delimiter"
  | "unclosed-quote"
  | "utf8-without-bom"
  | "no-headings"
  | "no-rows"
  | "too-many-bookings"
  // Header
  | "header-short"
  | "header-too-long"
  | "header-unquoted"
  | "header-version"
  | "header-version-old"
  | "header-category"
  | "header-category-unchecked"
  | "header-format-name"
  | "header-format-version"
  | "header-format-version-old"
  | "header-created"
  | "header-berater"
  | "header-mandant"
  | "header-wj"
  | "header-skl"
  | "header-skl-missing"
  | "header-date"
  | "header-dates-order"
  | "header-dates-year"
  | "header-before-wj"
  | "header-beyond-wj"
  | "header-label"
  | "header-festschreibung"
  | "header-currency"
  | "header-skr"
  // Headings
  | "headings-count"
  | "headings-differ"
  // Rows, both formats
  | "row-too-many-fields"
  | "row-too-few-fields"
  | "text-unquoted"
  | "text-control"
  // Buchungsstapel
  | "amount-missing"
  | "amount-dot"
  | "amount-negative"
  | "amount-thousands"
  | "amount-zero"
  | "amount-no-decimals"
  | "amount-format"
  | "side"
  | "currency"
  | "fx-pair"
  | "account-dragged"
  | "account-missing"
  | "account-format"
  | "account-length"
  | "account-same"
  | "bu-format"
  | "bu-automatic"
  | "date-missing"
  | "date-full"
  | "date-leading-zero"
  | "date-invalid"
  | "date-before-wj"
  | "date-outside-batch"
  | "beleg1-length"
  | "beleg1-chars"
  | "beleg1-underscore"
  | "beleg2-length"
  | "text-length"
  | "skonto"
  | "kost"
  | "eu-vat-id"
  | "eu-rate"
  | "service-date"
  | "service-date-period"
  | "lock-flag"
  | "reversal-flag"
  | "tax-rate"
  | "country"
  // Debitoren/Kreditoren
  | "person-missing"
  | "person-length"
  | "person-range"
  | "person-duplicate"
  | "addressee-type"
  | "name-missing"
  | "name-length"
  | "eu-country"
  | "eu-vat-prefix"
  | "postcode"
  | "iban";

export interface Finding {
  code: FindingCode;
  severity: Severity;
  /** Line in the file, 1-based. */
  line?: number;
  /** Field position within the line, 1-based. */
  field?: number;
  /** Field name as DATEV labels it. */
  fieldName?: string;
  /** The offending value, shortened. */
  value?: string;
  /** Extra values for the message, e.g. the maximum length. */
  params?: Record<string, string | number>;
}

export type Category = "buchungsstapel" | "debkred" | "other";

export interface Header {
  category: Category;
  categoryCode: string;
  formatVersion: number;
  berater: string;
  mandant: string;
  /** WJ-Beginn, Datum von and Datum bis as YYYYMMDD, if valid. */
  wjStart?: string;
  from?: string;
  to?: string;
  skl?: number;
  skr: string;
  label: string;
}

export interface Report {
  findings: Finding[];
  header?: Header;
  /** Data rows (bookings or accounts) below the two header lines. */
  rows: number;
  encoding: Decoded["encoding"];
}

/* ---------- Small helpers ---------- */

const MAX_VALUE = 60;
const shorten = (value: string) => (value.length > MAX_VALUE ? `${value.slice(0, MAX_VALUE - 1)}…` : value);

/** YYYYMMDD -> Date (UTC), or undefined if it isn't a real day in 20xx. */
function parseYmd(text: string): Date | undefined {
  const match = text.match(/^(20\d{2})(\d{2})(\d{2})$/);
  if (!match) return undefined;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : undefined;
}

const isRealDay = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/** "YYYYMMDD" of a UTC date. */
const ymd = (date: Date) =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;

/**
 * Automatic (AM) revenue accounts per chart that carry their own tax key, as
 * marked in the DATEV-Kontenrahmen SKR03 / SKR04 "Gültig für 2026" (Art.-Nr.
 * 11174 / 11175). A BU-Schlüssel on these (other than 40) makes DATEV reject
 * or double-count the tax. Only the common revenue accounts are listed.
 */
const automaticAccounts: Record<string, Set<string>> = {
  "03": new Set(["8120", "8125", "8300", "8310", "8315", "8336", "8338", "8400", "8449"]),
  "04": new Set(["4120", "4125", "4300", "4310", "4315", "4336", "4338", "4400", "4449"]),
};

/** ISO 13616 checksum. */
export function validIban(raw: string): boolean {
  const iban = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const digits = `${iban.slice(4)}${iban.slice(0, 4)}`.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

/* ---------- Validator ---------- */

const FORMAT_NAMES: Record<string, string> = {
  "16": "Debitoren/Kreditoren",
  "20": "Kontenbeschriftungen",
  "21": "Buchungsstapel",
  "44": "Textschlüssel",
  "46": "Zahlungsbedingungen",
  "48": "Diverse Adressen",
  "65": "Wiederkehrende Buchungen",
  "66": "Natural-Stapel",
};

/** Header fields DATEV writes as quoted text (1-based). */
const HEADER_TEXT_FIELDS = [1, 4, 8, 9, 10, 17, 18, 22, 27, 31];

const HEADER_NAMES: Record<number, string> = {
  1: "Kennzeichen",
  2: "Versionsnummer",
  3: "Formatkategorie",
  4: "Formatname",
  5: "Formatversion",
  6: "Erzeugt am",
  8: "Herkunft",
  9: "Exportiert von",
  10: "Importiert von",
  11: "Beraternummer",
  12: "Mandantennummer",
  13: "WJ-Beginn",
  14: "Sachkontenlänge",
  15: "Datum vom",
  16: "Datum bis",
  17: "Bezeichnung",
  18: "Diktatkürzel",
  21: "Festschreibung",
  22: "WKZ",
  27: "Sachkontenrahmen",
  31: "Anwendungsinformation",
};

/** Buchungsstapel fields that DATEV writes as quoted text and the validator checks. */
const BOOKING_TEXT_FIELDS = [2, 3, 9, 11, 12, 14, 37, 38, 40, 120];

/** Debitoren/Kreditoren fields that DATEV writes as quoted text and the validator checks. */
const DEBKRED_TEXT_FIELDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 18, 19, 20];

class Collector {
  findings: Finding[] = [];

  add(code: FindingCode, severity: Severity, detail: Omit<Finding, "code" | "severity"> = {}) {
    const finding: Finding = { code, severity, ...detail };
    if (finding.value !== undefined) finding.value = shorten(finding.value);
    this.findings.push(finding);
  }
}

function checkHeader(row: CsvRow, out: Collector): Header | undefined {
  const cells = row.cells;
  const line = row.line;
  const value = (field: number) => cells[field - 1]?.value.trim() ?? "";
  const at = (field: number) => ({ line, field, fieldName: HEADER_NAMES[field], value: value(field) });

  const kennzeichen = value(1);
  if (kennzeichen !== "EXTF" && kennzeichen !== "DTVF") {
    // A file that starts with the column headings is missing its first line.
    const looksLikeHeadings = /^(umsatz|konto)\b/i.test(kennzeichen);
    out.add(looksLikeHeadings ? "headings-first" : "not-extf", "error", { line, value: kennzeichen });
    return undefined;
  }

  if (cells.length < 31) {
    out.add("header-short", "error", { line, params: { count: cells.length, expected: 31 } });
  }

  for (const field of HEADER_TEXT_FIELDS) {
    const cell = cells[field - 1];
    if (cell && cell.value !== "" && !cell.quoted) out.add("header-unquoted", "warning", at(field));
  }

  const version = value(2);
  if (version === "510") out.add("header-version-old", "warning", at(2));
  else if (version !== "700") out.add("header-version", "error", at(2));

  const categoryCode = value(3);
  const formatName = FORMAT_NAMES[categoryCode];
  if (!formatName) {
    out.add("header-category", "error", at(3));
    return undefined;
  }
  if (value(4) !== formatName) {
    out.add("header-format-name", "error", { ...at(4), params: { expected: formatName } });
  }
  const category: Category = categoryCode === "21" ? "buchungsstapel" : categoryCode === "16" ? "debkred" : "other";
  if (category === "other") out.add("header-category-unchecked", "warning", { ...at(3), params: { name: formatName } });

  const formatVersion = Number(value(5));
  if (category === "buchungsstapel") {
    if (formatVersion >= 10 && formatVersion <= 12) out.add("header-format-version-old", "warning", at(5));
    else if (formatVersion !== 13) out.add("header-format-version", "error", { ...at(5), params: { expected: "13" } });
  } else if (category === "debkred" && formatVersion !== 5) {
    out.add("header-format-version", "error", { ...at(5), params: { expected: "5" } });
  }

  if (!/^20\d{15}$/.test(value(6)) || !parseYmd(value(6).slice(0, 8))) {
    out.add("header-created", "error", at(6));
  }

  const berater = value(11);
  if (!/^\d{4,7}$/.test(berater) || Number(berater) < 1001) out.add("header-berater", "error", at(11));
  const mandant = value(12);
  if (!/^\d{1,5}$/.test(mandant) || Number(mandant) < 1) out.add("header-mandant", "error", at(12));

  const wjDate = parseYmd(value(13));
  if (!wjDate) out.add("header-wj", "error", at(13));

  let skl: number | undefined;
  if (value(14) === "") {
    out.add("header-skl-missing", "warning", at(14));
  } else if (/^[4-8]$/.test(value(14))) {
    skl = Number(value(14));
  } else {
    out.add("header-skl", "error", at(14));
  }

  // Datum vom/bis only belong to transaction data.
  let fromDate: Date | undefined;
  let toDate: Date | undefined;
  if (category === "buchungsstapel") {
    fromDate = parseYmd(value(15));
    toDate = parseYmd(value(16));
    if (!fromDate) out.add("header-date", "error", at(15));
    if (!toDate) out.add("header-date", "error", at(16));
    if (fromDate && toDate) {
      if (toDate < fromDate) {
        out.add("header-dates-order", "error", { line, params: { from: value(15), to: value(16) } });
      } else if (fromDate.getUTCFullYear() !== toDate.getUTCFullYear()) {
        out.add("header-dates-year", "error", { line, params: { from: value(15), to: value(16) } });
      }
    }
    if (wjDate && fromDate && fromDate < wjDate) {
      out.add("header-before-wj", "error", { line, params: { from: value(15), wj: value(13) } });
    }
    if (wjDate && toDate) {
      const wjEnd = new Date(Date.UTC(wjDate.getUTCFullYear() + 1, wjDate.getUTCMonth(), wjDate.getUTCDate() - 1));
      if (toDate > wjEnd) out.add("header-beyond-wj", "error", { line, params: { to: value(16), end: ymd(wjEnd) } });
    }
    if (!["", "0", "1"].includes(value(21))) out.add("header-festschreibung", "error", at(21));
    if (value(22) !== "" && !/^[A-Z]{3}$/.test(value(22))) out.add("header-currency", "error", at(22));
  }

  if (value(17).length > 30) out.add("header-label", "warning", { ...at(17), params: { max: 30 } });
  if (value(27) !== "" && !/^\d{2}$/.test(value(27))) out.add("header-skr", "warning", at(27));

  return {
    category,
    categoryCode,
    formatVersion,
    berater,
    mandant,
    wjStart: wjDate ? value(13) : undefined,
    from: fromDate ? value(15) : undefined,
    to: toDate ? value(16) : undefined,
    skl,
    skr: value(27),
    label: value(17),
  };
}

const normalizeHeading = (text: string) => text.toLowerCase().replace(/[^a-z0-9äöüß]/g, "");

function checkHeadings(row: CsvRow, expected: readonly string[], expectedCount: number, out: Collector) {
  if (row.cells.length !== expectedCount) {
    out.add("headings-count", "warning", { line: row.line, params: { count: row.cells.length, expected: expectedCount } });
  }
  const differ = row.cells.findIndex(
    (cell, index) => index < expected.length && normalizeHeading(cell.value) !== normalizeHeading(expected[index]),
  );
  if (differ >= 0) {
    out.add("headings-differ", "warning", {
      line: row.line,
      field: differ + 1,
      value: row.cells[differ].value,
      params: { expected: expected[differ] },
    });
  }
}

/** Shared per-row checks: field count and quoting. */
function checkRowShape(row: CsvRow, columns: number, textFields: number[], fieldName: (field: number) => string, out: Collector) {
  if (row.cells.length > columns) {
    out.add("row-too-many-fields", "error", { line: row.line, params: { count: row.cells.length, expected: columns } });
  } else if (row.cells.length < columns) {
    out.add("row-too-few-fields", "warning", { line: row.line, params: { count: row.cells.length, expected: columns } });
  }
  for (const field of textFields) {
    const cell = row.cells[field - 1];
    if (cell && cell.value !== "" && !cell.quoted) {
      out.add("text-unquoted", "warning", { line: row.line, field, fieldName: fieldName(field), value: cell.value });
    }
  }
  row.cells.forEach((cell, index) => {
    if (/[\r\n\t]/.test(cell.value)) {
      out.add("text-control", "error", { line: row.line, field: index + 1, fieldName: fieldName(index + 1), value: cell.value });
    }
  });
}

/** Amount fields (Umsatz, Basis-Umsatz): "1234,56", positive, max 10 digits before the comma. */
function checkAmount(raw: string, required: boolean, at: Omit<Finding, "code" | "severity">, out: Collector) {
  if (raw === "") {
    if (required) out.add("amount-missing", "error", at);
    return;
  }
  if (/^\d{1,10},\d{2}$/.test(raw)) {
    if (/^0+,00$/.test(raw)) out.add("amount-zero", "error", at);
    return;
  }
  if (/^-/.test(raw)) out.add("amount-negative", "error", at);
  else if (/^\d{1,10}$/.test(raw)) out.add("amount-no-decimals", "warning", at);
  else if (/^\d+\.\d{1,2}$/.test(raw)) out.add("amount-dot", "error", at);
  else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw)) out.add("amount-thousands", "error", at);
  else out.add("amount-format", "error", at);
}

function checkAccount(raw: string, skl: number | undefined, at: Omit<Finding, "code" | "severity">, out: Collector): boolean {
  if (!/^\d{1,9}$/.test(raw) || /^0+$/.test(raw)) {
    out.add("account-format", "error", at);
    return false;
  }
  if (skl !== undefined && raw.length > skl + 1) {
    out.add("account-length", "error", { ...at, params: { skl, max: skl + 1 } });
    return false;
  }
  return true;
}

function checkBookings(header: Header, rows: CsvRow[], out: Collector) {
  const columns = BUCHUNGSSTAPEL_COLUMN_COUNT[header.formatVersion] ?? 125;
  const name = (field: number) => BUCHUNGSSTAPEL_COLUMNS[field - 1] ?? `Feld ${field}`;
  const wj = header.wjStart ? parseYmd(header.wjStart) : undefined;
  const from = header.from ? parseYmd(header.from) : undefined;
  const to = header.to ? parseYmd(header.to) : undefined;
  // DATEV takes the year from the header; Datum vom and bis share one calendar year.
  const year = from?.getUTCFullYear() ?? wj?.getUTCFullYear();
  const automatic = automaticAccounts[header.skr];

  for (const row of rows) {
    checkRowShape(row, columns, BOOKING_TEXT_FIELDS, name, out);
    const value = (field: number) => row.cells[field - 1]?.value.trim() ?? "";
    const at = (field: number) => ({ line: row.line, field, fieldName: name(field), value: value(field) });

    checkAmount(value(1), true, at(1), out);

    if (!/^[SH]$/.test(value(2))) out.add("side", "error", at(2));
    if (value(3) !== "" && !/^[A-Z]{3}$/.test(value(3))) out.add("currency", "error", at(3));
    checkAmount(value(5), false, at(5), out);
    if ((value(5) === "") !== (value(6) === "")) {
      out.add("fx-pair", "error", { line: row.line, params: { a: name(5), b: name(6) } });
    }

    let account = value(7);
    if (account === "") out.add("account-dragged", "warning", at(7));
    else if (!checkAccount(account, header.skl, at(7), out)) account = "";
    let contra = value(8);
    if (contra === "") out.add("account-missing", "error", at(8));
    else if (!checkAccount(contra, header.skl, at(8), out)) contra = "";
    if (account !== "" && account === contra) out.add("account-same", "warning", at(8));

    const key = value(9);
    if (key !== "") {
      if (!/^\d{1,4}$/.test(key)) {
        out.add("bu-format", "error", at(9));
      } else if (automatic && key !== "40") {
        const hit = [account, contra].find((number) => automatic.has(number));
        if (hit) out.add("bu-automatic", "warning", { ...at(9), params: { account: hit, skr: header.skr } });
      }
    }

    checkBookingDate(value(10), at(10), { year, wj, from, to }, out);

    const beleg1 = value(11);
    if (beleg1.length > 36) out.add("beleg1-length", "error", { ...at(11), params: { max: 36 } });
    if (/[^A-Za-z0-9$&%*+\-/_]/.test(beleg1)) out.add("beleg1-chars", "error", at(11));
    else if (beleg1.includes("_")) out.add("beleg1-underscore", "warning", at(11));
    if (value(12).length > 12) out.add("beleg2-length", "warning", { ...at(12), params: { max: 12 } });
    if (value(13) !== "" && !/^\d{1,8},\d{2}$/.test(value(13))) out.add("skonto", "error", at(13));
    if (value(14).length > 60) out.add("text-length", "warning", { ...at(14), params: { max: 60 } });

    for (const field of [37, 38]) {
      if (value(field).length > 36 || /[^\w ]/.test(value(field))) out.add("kost", "warning", at(field));
    }
    if (value(40) !== "" && !/^[A-Z]{2}[A-Z0-9+*]{2,13}$/.test(value(40).replace(/\s/g, ""))) {
      out.add("eu-vat-id", "error", at(40));
    }
    if (value(41) !== "" && !/^\d{1,2},\d{2}$/.test(value(41))) out.add("eu-rate", "error", at(41));

    if (columns >= 120) {
      if (!["", "0", "1"].includes(value(114))) out.add("lock-flag", "error", at(114));
      for (const field of [115, 116, 117]) {
        if (value(field) !== "" && !validDdmmyyyy(value(field))) out.add("service-date", "error", at(field));
      }
      if (value(115) !== "" && value(116) === "") {
        out.add("service-date-period", "error", { line: row.line, params: { a: name(115), b: name(116) } });
      }
      if (!["", "0", "1", "G"].includes(value(118))) out.add("reversal-flag", "error", at(118));
      if (value(119) !== "" && !/^\d{1,2},\d{2}$/.test(value(119))) out.add("tax-rate", "error", at(119));
      if (value(120) !== "" && !/^[A-Z]{2}$/.test(value(120))) out.add("country", "error", at(120));
    }
  }

  if (rows.length > 99999) out.add("too-many-bookings", "error", { params: { count: rows.length, max: 99999 } });
}

const validDdmmyyyy = (text: string) => {
  const match = text.match(/^(\d{2})(\d{2})(20\d{2})$/);
  return match ? isRealDay(Number(match[3]), Number(match[2]), Number(match[1])) : false;
};

function checkBookingDate(
  raw: string,
  at: Omit<Finding, "code" | "severity">,
  period: { year?: number; wj?: Date; from?: Date; to?: Date },
  out: Collector,
) {
  if (raw === "") {
    out.add("date-missing", "error", at);
    return;
  }
  if (/^\d{1,2}\.\d{1,2}\.(\d{2}|\d{4})$/.test(raw) || /^\d{8}$/.test(raw) || /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    out.add("date-full", "error", at);
    return;
  }
  if (/^\d{3}$/.test(raw)) {
    out.add("date-leading-zero", "error", { ...at, params: { fixed: raw.padStart(4, "0") } });
    return;
  }
  if (!/^\d{4}$/.test(raw)) {
    out.add("date-invalid", "error", at);
    return;
  }
  const day = Number(raw.slice(0, 2));
  const month = Number(raw.slice(2));
  // 29 Feb is fine unless we know the year isn't a leap year.
  if (!isRealDay(period.year ?? 2024, month, day)) {
    out.add("date-invalid", "error", at);
    return;
  }
  if (period.year === undefined) return;
  const date = new Date(Date.UTC(period.year, month - 1, day));
  if (period.wj && date < period.wj) {
    out.add("date-before-wj", "error", { ...at, params: { wj: ymd(period.wj) } });
  } else if (period.from && period.to && (date < period.from || date > period.to)) {
    out.add("date-outside-batch", "warning", { ...at, params: { from: ymd(period.from), to: ymd(period.to) } });
  }
}

function checkPersons(header: Header, rows: CsvRow[], out: Collector) {
  const columns = DEBKRED_COLUMNS.length;
  const name = (field: number) => DEBKRED_COLUMNS[field - 1] ?? `Feld ${field}`;
  const seen = new Map<string, number>();
  const ibanFields = DEBKRED_COLUMNS.flatMap((heading, index) => (heading.startsWith("IBAN") ? [index + 1] : []));

  for (const row of rows) {
    checkRowShape(row, columns, DEBKRED_TEXT_FIELDS, name, out);
    const value = (field: number) => row.cells[field - 1]?.value.trim() ?? "";
    const at = (field: number) => ({ line: row.line, field, fieldName: name(field), value: value(field) });

    const account = value(1);
    if (account === "") {
      out.add("person-missing", "error", at(1));
    } else if (!/^\d{1,9}$/.test(account) || /^0+$/.test(account)) {
      out.add("account-format", "error", at(1));
    } else if (header.skl !== undefined && account.length !== header.skl + 1) {
      out.add("person-length", "error", { ...at(1), params: { skl: header.skl, expected: header.skl + 1 } });
    } else if (account.startsWith("0")) {
      out.add("person-range", "error", at(1));
    } else {
      const first = seen.get(account);
      if (first) out.add("person-duplicate", "warning", { ...at(1), params: { first } });
      else seen.set(account, row.line);
    }

    // Which name field is shown depends on the addressee type; empty means company.
    const type = value(7);
    if (!["", "0", "1", "2"].includes(type)) {
      out.add("addressee-type", "error", at(7));
    } else {
      const nameField = type === "1" ? 4 : type === "0" ? 6 : 2;
      if (value(nameField) === "") {
        out.add("name-missing", "warning", { ...at(nameField), params: { type: type || "2" } });
      }
    }
    const limits: [number, number][] = [
      [2, 50],
      [3, 50],
      [4, 30],
      [5, 30],
      [6, 50],
      [8, 15],
      [16, 36],
      [19, 30],
    ];
    for (const [field, max] of limits) {
      if (value(field).length > max) out.add("name-length", "warning", { ...at(field), params: { max } });
    }

    if (value(9) !== "" && !/^[A-Z]{2}$/.test(value(9))) out.add("eu-country", "error", at(9));
    if (/^[A-Z]{2}/.test(value(10)) && value(9) !== "" && value(10).startsWith(value(9))) {
      out.add("eu-vat-prefix", "warning", at(10));
    }
    if (value(18) !== "" && !/^\d{1,10}$/.test(value(18))) out.add("postcode", "error", at(18));
    if (value(20) !== "" && !/^[A-Z]{2}$/.test(value(20))) out.add("country", "error", at(20));
    for (const field of ibanFields) {
      if (value(field) !== "" && !validIban(value(field))) out.add("iban", "error", at(field));
    }
  }
}

/** Check an EXTF file. `decoded` is the file's bytes after `decodeBytes`. */
export function validateExtf(decoded: Decoded): Report {
  const out = new Collector();
  const report: Report = { findings: out.findings, rows: 0, encoding: decoded.encoding };
  const text = decoded.text;

  if (text.trim() === "") {
    out.add("empty", "error");
    return report;
  }

  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  if (!firstLine.includes(";") && /^"?(EXTF|DTVF)"?[,\t]/.test(firstLine)) {
    out.add("wrong-delimiter", "error", { line: 1 });
    return report;
  }

  // DATEV reads Windows-1252 unless the file starts with a BOM.
  if (decoded.encoding === "utf-8" && decoded.nonAscii) out.add("utf8-without-bom", "warning");

  const parsed = parseCsv(text, ";");
  if (parsed.unclosedQuoteLine) out.add("unclosed-quote", "error", { line: parsed.unclosedQuoteLine });

  const [headerRow, headingRow, ...rows] = parsed.rows;
  const header = checkHeader(headerRow, out);
  if (!header) return report;
  report.header = header;
  if (firstLine.length > 1000) out.add("header-too-long", "warning", { line: 1, params: { count: firstLine.length, max: 1000 } });

  if (!headingRow) {
    out.add("no-headings", "error");
    return report;
  }
  report.rows = rows.length;

  if (header.category === "buchungsstapel") {
    checkHeadings(headingRow, BUCHUNGSSTAPEL_COLUMNS, BUCHUNGSSTAPEL_COLUMN_COUNT[header.formatVersion] ?? 125, out);
    if (rows.length === 0) out.add("no-rows", "warning");
    checkBookings(header, rows, out);
  } else if (header.category === "debkred") {
    checkHeadings(headingRow, DEBKRED_COLUMNS, DEBKRED_COLUMNS.length, out);
    if (rows.length === 0) out.add("no-rows", "warning");
    checkPersons(header, rows, out);
  }
  return report;
}

/* ---------- Writer ---------- */

export interface BatchHeader {
  berater: string;
  mandant: string;
  /** YYYYMMDD */
  wjStart: string;
  skl: number;
  /** YYYYMMDD */
  from: string;
  to: string;
  label: string;
  /** "03" or "04", or "" if unknown. */
  skr: string;
  /** Creation time, injectable for tests. */
  created: Date;
}

export interface BatchRow {
  /** Unsigned amount in cents. */
  amount: number;
  side: "S" | "H";
  account: string;
  contra: string;
  key?: string;
  /** Belegdatum as day and month. */
  day: number;
  month: number;
  beleg1?: string;
  text?: string;
}

/** Belegfeld 1 keeps only the characters DATEV allows, at most 36. */
export const cleanBeleg1 = (text: string) => text.replace(/[^A-Za-z0-9$&%*+\-/]/g, "").slice(-36);

/** Text for a quoted field: no line breaks or tabs, at most `max` characters. */
const cleanText = (text: string, max: number) => text.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

const formatCents = (cents: number) => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/**
 * A Buchungsstapel, Formatversion 13, as text with CRLF line ends. Encode it
 * with encodeCp1252 before offering it as a download: that's DATEV's default
 * character set, and the one every import path supports.
 */
export function writeBuchungsstapel(header: BatchHeader, rows: BatchRow[]): string {
  const c = header.created;
  const created = `${c.getFullYear()}${pad(c.getMonth() + 1)}${pad(c.getDate())}${pad(c.getHours())}${pad(c.getMinutes())}${pad(c.getSeconds())}${pad(c.getMilliseconds(), 3)}`;
  const headerFields = [
    quote("EXTF"),
    "700",
    "21",
    quote("Buchungsstapel"),
    "13",
    created,
    "",
    quote("RE"),
    quote(""),
    quote(""),
    header.berater,
    header.mandant,
    header.wjStart,
    String(header.skl),
    header.from,
    header.to,
    quote(cleanText(header.label, 30)),
    quote(""),
    "1",
    "0",
    "0",
    quote("EUR"),
    "",
    quote(""),
    "",
    "",
    quote(header.skr),
    "",
    "",
    quote(""),
    quote(""),
  ];
  const lines = [headerFields.join(";"), BUCHUNGSSTAPEL_COLUMNS.join(";")];
  for (const row of rows) {
    const fields: string[] = new Array(BUCHUNGSSTAPEL_COLUMNS.length).fill("");
    fields[0] = formatCents(row.amount);
    fields[1] = quote(row.side);
    fields[2] = quote("EUR");
    fields[6] = row.account;
    fields[7] = row.contra;
    fields[8] = quote(row.key ?? "");
    fields[9] = `${pad(row.day)}${pad(row.month)}`;
    fields[10] = quote(cleanBeleg1(row.beleg1 ?? ""));
    fields[13] = quote(cleanText(row.text ?? "", 60));
    lines.push(fields.join(";"));
  }
  return `${lines.join("\r\n")}\r\n`;
}

