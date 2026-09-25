import { describe, expect, it } from "vitest";
import { decodeBytes, detectDelimiter, encodeCp1252, fitsCp1252, parseCsv } from "../src/csv.js";

describe("parseCsv", () => {
  it("splits quoted and unquoted cells", () => {
    const { rows } = parseCsv('"EXTF";700;"a;b"\r\n1,00;"S"', ";");
    expect(rows.map((row) => row.cells.map((cell) => cell.value))).toEqual([
      ["EXTF", "700", "a;b"],
      ["1,00", "S"],
    ]);
    expect(rows[0].cells.map((cell) => cell.quoted)).toEqual([true, false, true]);
  });

  it("keeps doubled quotes and line breaks inside quotes, and counts lines", () => {
    const { rows } = parseCsv('"say ""hi""";"two\nlines"\n\nnext', ";");
    expect(rows[0].cells[0].value).toBe('say "hi"');
    expect(rows[0].cells[1].value).toBe("two\nlines");
    expect(rows[1]).toMatchObject({ line: 4, cells: [{ value: "next" }] });
  });

  it("keeps trailing empty cells and reports unclosed quotes", () => {
    expect(parseCsv("a;;\n", ";").rows[0].cells).toHaveLength(3);
    expect(parseCsv('a;"open\nb', ";").unclosedQuoteLine).toBe(1);
  });
});

describe("encoding", () => {
  it("round-trips Windows-1252", () => {
    const text = "Bürobedarf € – „Test“";
    expect(fitsCp1252(text)).toBe(true);
    const decoded = decodeBytes(encodeCp1252(text));
    expect(decoded).toEqual({ text, encoding: "windows-1252", nonAscii: true });
  });

  it("recognises UTF-8 with and without BOM", () => {
    const utf8 = new TextEncoder().encode("Größe");
    expect(decodeBytes(utf8).encoding).toBe("utf-8");
    expect(decodeBytes(Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8]))).toMatchObject({
      text: "Größe",
      encoding: "utf-8-bom",
    });
    expect(fitsCp1252("✓")).toBe(false);
  });

  it("detects the delimiter from the first line", () => {
    expect(detectDelimiter('"Date","Time","Name"\n1;2')).toBe(",");
    expect(detectDelimiter("EXTF;700;21")).toBe(";");
  });
});
