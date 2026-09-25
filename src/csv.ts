/**
 * CSV plumbing for EXTF files: decoding bytes, splitting delimited text into
 * rows, and encoding the Windows-1252 text DATEV expects. Runs in browsers,
 * Node, Deno and Bun alike, so it uses nothing beyond TextDecoder.
 */

/** Characters Windows-1252 puts at 0x80-0x9F, where Latin-1 has control codes. */
const CP1252_HIGH: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

/** Byte for a character in Windows-1252, or undefined if it has none. */
function cp1252Byte(code: number): number | undefined {
  if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) return code;
  return CP1252_HIGH[code];
}

/** Whether every character of `text` exists in Windows-1252. */
export function fitsCp1252(text: string): boolean {
  for (const char of text) {
    if (cp1252Byte(char.codePointAt(0) ?? 0) === undefined) return false;
  }
  return true;
}

/** Encode text as Windows-1252. Characters without a byte become "?". */
export function encodeCp1252(text: string): Uint8Array<ArrayBuffer> {
  const bytes: number[] = [];
  for (const char of text) bytes.push(cp1252Byte(char.codePointAt(0) ?? 0) ?? 0x3f);
  return Uint8Array.from(bytes);
}

export type Encoding = "utf-8" | "utf-8-bom" | "windows-1252";

export interface Decoded {
  text: string;
  encoding: Encoding;
  /** Whether the text contains anything outside ASCII, i.e. whether the encoding matters. */
  nonAscii: boolean;
}

/**
 * Decode an uploaded file. Valid UTF-8 is taken as UTF-8 (plain ASCII is too,
 * which is also valid Windows-1252); anything else is read as Windows-1252,
 * which can decode every byte.
 */
export function decodeBytes(bytes: Uint8Array): Decoded {
  const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const body = bom ? bytes.subarray(3) : bytes;
  const nonAscii = body.some((byte) => byte >= 0x80);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return { text, encoding: bom ? "utf-8-bom" : "utf-8", nonAscii };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(body), encoding: "windows-1252", nonAscii };
  }
}

export interface CsvCell {
  value: string;
  /** Whether the cell was wrapped in double quotes in the file. */
  quoted: boolean;
}

export interface CsvRow {
  /** 1-based line number where the row starts, for messages. */
  line: number;
  cells: CsvCell[];
}

export interface ParsedCsv {
  rows: CsvRow[];
  /** Line of a quote that was opened and never closed, if any. */
  unclosedQuoteLine?: number;
}

/**
 * Split delimited text into rows. Follows RFC 4180 quoting: a quoted cell may
 * contain the delimiter, line breaks and doubled quotes. Empty lines are
 * dropped.
 */
export function parseCsv(text: string, delimiter: string): ParsedCsv {
  const rows: CsvRow[] = [];
  let cells: CsvCell[] = [];
  let value = "";
  let quoted = false;
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;
  let quoteLine = 0;

  const endCell = () => {
    cells.push({ value, quoted });
    value = "";
    quoted = false;
  };
  const endRow = () => {
    endCell();
    const blank = cells.length === 1 && cells[0].value === "" && !cells[0].quoted;
    if (!blank) rows.push({ line: rowLine, cells });
    cells = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line++;
        value += char;
      }
      continue;
    }
    if (char === '"' && value === "" && !quoted) {
      inQuotes = true;
      quoted = true;
      quoteLine = line;
    } else if (char === delimiter) {
      endCell();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRow();
      line++;
      rowLine = line;
    } else {
      value += char;
    }
  }
  if (value !== "" || quoted || cells.length > 0) endRow();

  return inQuotes ? { rows, unclosedQuoteLine: quoteLine } : { rows };
}

/** The most likely delimiter of a CSV file, judged by its first line. */
export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const counts = [";", ",", "\t"].map((candidate) => ({
    candidate,
    count: firstLine.split(candidate).length - 1,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].candidate : ";";
}

/** Quote a text cell for a semicolon-separated DATEV file. */
export function quote(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
}
