# datev-extf

[![npm](https://img.shields.io/npm/v/@seamless-engineering/datev-extf)](https://www.npmjs.com/package/@seamless-engineering/datev-extf)
[![CI](https://github.com/seamless-engineering/datev-extf/actions/workflows/ci.yml/badge.svg)](https://github.com/seamless-engineering/datev-extf/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

Validate and write DATEV-Format (EXTF) files in TypeScript: **Buchungsstapel** (booking batches) and **Debitoren/Kreditoren** (customer and supplier master data). Every finding comes with a line, a field and a plain-language explanation in German or English.

*Deutsch:* Prüft und schreibt Dateien im DATEV-Format (EXTF). Der Validator meldet Fehler wie Punkt statt Komma im Umsatz, fehlende führende Null im Belegdatum, BU-Schlüssel auf Automatikkonten oder zu lange Kontonummern, jeweils mit Zeile, Feld und einer verständlichen Erklärung, bevor DATEV den Import ablehnt.

Try it in the browser, no upload: [DATEV EXTF validator](https://seamless.engineering/de/tools/datev-extf-validator/) ([English](https://seamless.engineering/tools/datev-extf-validator/)).

- Zero runtime dependencies. Runs in browsers, Node 20+, Deno and Bun.
- Reads Windows-1252 and UTF-8 (with or without BOM), writes Windows-1252 as DATEV expects.
- Rules come from DATEV's own material: the field regexes of the Formatbeschreibung on developer.datev.de, the field definitions shipped with the DATEV-Format Prüfprogramm, and the `#REW` import messages from the DATEV Hilfe-Center. Where those sources disagree, the check is a warning, not an error.

## Install

From npm: [`@seamless-engineering/datev-extf`](https://www.npmjs.com/package/@seamless-engineering/datev-extf)

```sh
npm install @seamless-engineering/datev-extf
```

## Validate a file

```ts
import { readFile } from "node:fs/promises";
import { decodeBytes, formatFinding, validateExtf } from "@seamless-engineering/datev-extf";

const report = validateExtf(decodeBytes(await readFile("EXTF_Buchungsstapel.csv")));

for (const finding of report.findings) {
  console.log(`${finding.severity} line ${finding.line}: ${formatFinding(finding, "en")}`);
}
// error line 4: Amount “49.90” uses a dot as the decimal separator. DATEV expects a comma: 12.50 becomes 12,50.
```

`report.header` holds the parsed header (Berater, Mandant, WJ-Beginn, Sachkontenlänge, period, SKR). Each `Finding` has a stable `code` you can switch on, a `severity` (`error` or `warning`), and `line`, `field`, `fieldName`, `value` and `params` where they apply.

## Write a Buchungsstapel

```ts
import { writeFile } from "node:fs/promises";
import { encodeCp1252, writeBuchungsstapel } from "@seamless-engineering/datev-extf";

const csv = writeBuchungsstapel(
  {
    berater: "29098",
    mandant: "55003",
    wjStart: "20260101",
    skl: 4,
    from: "20260601",
    to: "20260630",
    label: "Shop 06/2026",
    skr: "03",
    created: new Date(),
  },
  [{ amount: 11900, side: "S", account: "1360", contra: "8400", day: 2, month: 6, beleg1: "RE2026-114", text: "Bestellung 114" }],
);

await writeFile("EXTF_Buchungsstapel.csv", encodeCp1252(csv));
```

Amounts are unsigned cents. The writer produces Formatversion 13 with CRLF line ends, and every file it writes passes the validator.

## What gets checked

- **File:** encoding, delimiter, unclosed quotes, missing header or column headings, more than 99,999 bookings.
- **Header:** version 700, format category and version, timestamp, Beraternummer and Mandantennummer, WJ-Beginn, Sachkontenlänge, batch period (one calendar year, inside the fiscal year), currency, SKR.
- **Buchungsstapel rows:** amount format, Soll/Haben, accounts and their length, BU-Schlüssel (including keys on automatic revenue accounts), Belegdatum (TTMM, inside the fiscal year and batch period), Belegfeld 1 characters and length, booking text length, cost centres, EU VAT ID and rate, service dates, Festschreibung, Generalumkehr, country codes.
- **Debitoren/Kreditoren rows:** account length and range, duplicates, addressee type and matching name field, field lengths, EU country and VAT ID, postcode, IBAN checksum.

Other EXTF categories (Kontenbeschriftungen, Textschlüssel, Zahlungsbedingungen, Diverse Adressen, Wiederkehrende Buchungen, Natural-Stapel) are recognised and header-checked only.

## Not tax advice

The validator checks format, not bookkeeping. It can't tell whether an account or tax key is right for a transaction. Agree that with your tax advisor.

DATEV and DATEV-Format are trademarks of DATEV eG. This project is not affiliated with or endorsed by DATEV.

## Maintenance

Maintained by [seamless.engineering](https://seamless.engineering) for our own production use: we run managed [DATEV integrations](https://seamless.engineering/de/integrations/) for shops, payment providers and ERPs, fully EU-hosted. Issues and PRs welcome, no SLA.

## Releasing

Bump `version` in `package.json`, commit, then tag and push: `git tag v0.1.1 && git push origin v0.1.1`. The release workflow publishes to npm with provenance via trusted publishing.

MIT licence.
