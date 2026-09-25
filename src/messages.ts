/**
 * Messages for the validator's findings, one per code in extf.ts. German first, written for the person who
 * has to fix the export, not for the one who wrote the spec.
 *
 * Placeholders: {field} field name, {value} the value found, plus the
 * finding's params ({max}, {expected}, {count}, {skl}, ...). Dates in params
 * are YYYYMMDD; `formatFinding` shows them as DD.MM.YYYY (de) or DD/MM/YYYY (en).
 */

import type { Finding, FindingCode } from "./extf.js";

export type Lang = "de" | "en";

export const messages: Record<Lang, Record<FindingCode, string>> = {
  de: {
    empty: "Die Datei ist leer.",
    "not-extf":
      "Das ist keine Datei im DATEV-Format: Die erste Zeile muss mit „EXTF“ beginnen, hier steht „{value}“. Für den Import braucht DATEV den EXTF-Header mit Berater, Mandant, Wirtschaftsjahr und Zeitraum.",
    "headings-first":
      "Die erste Zeile fehlt. Die Datei beginnt direkt mit den Spaltenüberschriften, davor gehört der EXTF-Header mit Berater, Mandant, Wirtschaftsjahr und Zeitraum. Ohne ihn findet DATEV beim Import „keine Daten“.",
    "wrong-delimiter":
      "Die Felder sind mit Komma oder Tabulator getrennt. DATEV erwartet ein Semikolon. Das passiert oft, wenn die Datei in Excel mit englischen Ländereinstellungen gespeichert wurde.",
    "unclosed-quote":
      "In Zeile {line} wird ein Anführungszeichen geöffnet und nie geschlossen. Alles danach landet im selben Feld. Meist steckt ein einzelnes \" in einem Buchungstext, das verdoppelt werden müsste (\"\").",
    "utf8-without-bom":
      "Die Datei ist UTF-8-codiert, aber ohne BOM. DATEV liest sie dann als Windows-1252, und aus Umlauten wird Zeichensalat („Ã¼“ statt „ü“). Speichern Sie als ANSI/Windows-1252 oder als „UTF-8 mit BOM“.",
    "no-headings": "Nach dem Header fehlt die zweite Zeile mit den Spaltenüberschriften.",
    "no-rows": "Die Datei enthält keine Datenzeilen, nur Header und Spaltenüberschriften.",
    "too-many-bookings": "Die Datei enthält {count} Buchungen. DATEV nimmt höchstens {max} pro Stapel. Teilen Sie den Export auf.",
    "header-short":
      "Der Header hat nur {count} Felder, vorgesehen sind {expected}. Auch leere Felder müssen mit Semikolon angelegt sein.",
    "header-too-long": "Der Header ist {count} Zeichen lang. Der DATEV-Buchungsdatenservice nimmt höchstens {max}.",
    "header-unquoted":
      "Das Header-Feld {field} steht nicht in Anführungszeichen. DATEV schreibt Textfelder als \"{value}\". Viele Importe tolerieren das, das Prüfprogramm von DATEV meldet es.",
    "header-version": "Versionsnummer „{value}“ im Header ist unbekannt. Aktuell ist 700.",
    "header-version-old": "Header-Version 510 ist veraltet. Aktuell ist 700. Neuere DATEV-Versionen lesen sie noch, verlassen sollten Sie sich darauf nicht.",
    "header-category": "Formatkategorie „{value}“ gibt es nicht. Ein Buchungsstapel hat 21, Debitoren/Kreditoren haben 16.",
    "header-category-unchecked":
      "Das ist ein Stapel „{name}“. Hier wird nur der Header geprüft. Zeile für Zeile geprüft werden nur Buchungsstapel und Debitoren/Kreditoren.",
    "header-format-name": "Der Formatname „{value}“ passt nicht zur Formatkategorie. Erwartet wird „{expected}“.",
    "header-format-version": "Formatversion „{value}“ passt nicht. Erwartet wird {expected}.",
    "header-format-version-old":
      "Formatversion {value} ist älter als die aktuelle 13. DATEV liest sie noch, aber Felder, die später dazukamen (etwa ein abweichendes Skontokonto), fehlen.",
    "header-created": "„Erzeugt am“ muss ein Zeitstempel mit 17 Ziffern sein (JJJJMMTTHHMMSSmmm), gefunden wurde „{value}“.",
    "header-berater":
      "Beraternummer „{value}“ ist ungültig. Erlaubt sind 1001 bis 9999999. Passt die Nummer formal, aber nicht zum Bestand, meldet DATEV „Beraternummer nicht gefunden“.",
    "header-mandant": "Mandantennummer „{value}“ ist ungültig. Erlaubt sind 1 bis 99999.",
    "header-wj": "Der Beginn des Wirtschaftsjahres „{value}“ ist kein gültiges Datum im Format JJJJMMTT.",
    "header-skl": "Sachkontenlänge „{value}“ ist ungültig. Erlaubt sind 4 bis 8, und der Wert muss exakt zur Einstellung des Mandanten passen.",
    "header-skl-missing":
      "Die Sachkontenlänge ist leer. DATEV nimmt dann die Länge aus dem Mandanten. Das geht gut, solange Ihre Kontonummern dazu passen.",
    "header-date": "{field} „{value}“ ist kein gültiges Datum im Format JJJJMMTT.",
    "header-dates-order": "„Datum bis“ ({to}) liegt vor „Datum vom“ ({from}).",
    "header-dates-year":
      "„Datum vom“ ({from}) und „Datum bis“ ({to}) liegen in verschiedenen Kalenderjahren. Das lehnt DATEV ab (#REW04404). Exportieren Sie einen Stapel je Kalenderjahr.",
    "header-before-wj": "„Datum vom“ ({from}) liegt vor dem Beginn des Wirtschaftsjahres ({wj}).",
    "header-beyond-wj": "„Datum bis“ ({to}) liegt nach dem Ende des Wirtschaftsjahres ({end}).",
    "header-label": "Die Stapel-Bezeichnung ist länger als {max} Zeichen und wird gekürzt.",
    "header-festschreibung": "Festschreibung „{value}“ ist ungültig. Erlaubt sind 0 (keine Festschreibung) und 1.",
    "header-currency": "Währung „{value}“ ist kein ISO-Code aus drei Großbuchstaben, etwa EUR.",
    "header-skr": "Sachkontenrahmen „{value}“ sieht ungewöhnlich aus. Üblich sind zwei Ziffern, etwa 03 oder 04.",
    "headings-count":
      "Die Zeile mit den Spaltenüberschriften hat {count} Spalten, zur Formatversion gehören {expected}. DATEV liest die Spalten nach Position: Fehlt vorne eine, rutscht alles dahinter ins falsche Feld.",
    "headings-differ":
      "Ab Spalte {field} weichen die Überschriften ab: „{value}“ statt „{expected}“. DATEV ordnet nach Position zu, prüfen Sie, ob die Spalten verrutscht sind.",
    "row-too-many-fields":
      "Zeile {line} hat {count} Felder statt {expected}. Fast immer steht ein Semikolon in einem Text, der nicht in Anführungszeichen steht. Alle Felder danach verrutschen.",
    "row-too-few-fields": "Zeile {line} hat {count} Felder statt {expected}. Leere Felder am Ende sollten trotzdem mit Semikolon angelegt sein.",
    "text-unquoted": "{field} „{value}“ steht nicht in Anführungszeichen. DATEV erwartet Textfelder in \"…\".",
    "text-control":
      "{field} enthält einen Zeilenumbruch oder Tabulator. Steuerzeichen sind in DATEV-Textfeldern nicht erlaubt.",
    "amount-missing": "Der Umsatz fehlt. Er ist ein Pflichtfeld.",
    "amount-dot":
      "Umsatz „{value}“ hat einen Punkt als Dezimaltrenner. DATEV erwartet ein Komma: aus 12.50 wird 12,50.",
    "amount-negative":
      "Umsatz „{value}“ ist negativ. DATEV kennt kein Vorzeichen: Der Betrag ist immer positiv, die Richtung steht im Soll/Haben-Kennzeichen.",
    "amount-thousands": "Umsatz „{value}“ enthält einen Tausenderpunkt. DATEV erwartet 1234,56, nicht 1.234,56.",
    "amount-zero": "Der Umsatz ist 0,00. Buchungen über null lehnt DATEV ab.",
    "amount-no-decimals":
      "Umsatz „{value}“ hat keine Nachkommastellen. Laut Formatbeschreibung gehören immer zwei dazu (100,00). DATEV liest das meist trotzdem, sicherer ist die vollständige Form.",
    "amount-format": "Umsatz „{value}“ ist kein gültiger Betrag. Erwartet: bis zu zehn Stellen, Komma, zwei Nachkommastellen.",
    side: "Das Soll/Haben-Kennzeichen „{value}“ ist ungültig. Erlaubt sind S und H, bezogen auf das Konto.",
    currency: "Währung „{value}“ ist kein ISO-Code aus drei Großbuchstaben.",
    "fx-pair": "„{a}“ und „{b}“ gehören zusammen: Ist eines gefüllt, muss es auch das andere sein.",
    "account-dragged":
      "Das Konto ist leer. DATEV übernimmt es dann aus der Zeile davor („geschleppt“). Das ist selten gewollt und bei einer sortierten Datei ein Fehler, der niemandem auffällt.",
    "account-missing": "{field} ist leer. Es ist ein Pflichtfeld.",
    "account-format": "{field} „{value}“ ist keine gültige Kontonummer. Erlaubt sind nur Ziffern, höchstens neun, nicht nur Nullen.",
    "account-length":
      "{field} „{value}“ ist zu lang. Bei Sachkontenlänge {skl} haben Sachkonten {skl} Stellen und Personenkonten höchstens {max}.",
    "account-same": "Konto und Gegenkonto sind beide {value}. Eine Buchung auf sich selbst ist fast immer ein Zuordnungsfehler.",
    "bu-format": "BU-Schlüssel „{value}“ ist ungültig. Erlaubt sind ein- bis vierstellige Ziffernfolgen.",
    "bu-automatic":
      "Konto {account} ist im SKR{skr} ein Automatikkonto, die Steuer steckt schon im Konto. Ein zusätzlicher BU-Schlüssel („{value}“) führt dort meist zu „Ungültiger BU-Schlüssel“.",
    "date-missing": "Das Belegdatum fehlt. Es ist ein Pflichtfeld.",
    "date-full":
      "Belegdatum „{value}“ ist ein vollständiges Datum. DATEV erwartet nur Tag und Monat (TTMM, etwa 3101), das Jahr kommt aus dem Header.",
    "date-leading-zero":
      "Belegdatum „{value}“ hat nur drei Stellen, die führende Null fehlt. Das passiert, wenn Excel die Spalte als Zahl speichert. Richtig wäre {fixed}.",
    "date-invalid": "Belegdatum „{value}“ ist kein gültiger Tag im Format TTMM.",
    "date-before-wj": "Belegdatum „{value}“ liegt vor dem Beginn des Wirtschaftsjahres ({wj}). DATEV lehnt das ab (#REW00314).",
    "date-outside-batch":
      "Belegdatum „{value}“ liegt außerhalb des Stapelzeitraums ({from} bis {to}). Prüfen Sie Datum oder Zeitraum im Header.",
    "beleg1-length": "Belegfeld 1 ist länger als {max} Zeichen: „{value}“.",
    "beleg1-chars":
      "Belegfeld 1 „{value}“ enthält Zeichen, die DATEV dort nicht erlaubt. Zulässig sind Buchstaben, Ziffern und $ & % * + - /, also keine Leerzeichen, Umlaute, Punkte oder Unterstriche.",
    "beleg1-underscore":
      "Belegfeld 1 „{value}“ enthält einen Unterstrich. DATEVs Formatregel lässt ihn zu, die Beschreibung nennt ihn nicht. Wenn der Import ihn ablehnt, lassen Sie ihn weg.",
    "beleg2-length": "Belegfeld 2 ist länger als {max} Zeichen: „{value}“. DATEVs Prüfprogramm erlaubt dort nur {max}.",
    "text-length": "Der Buchungstext hat mehr als {max} Zeichen. DATEV kürzt ihn beim Import.",
    skonto: "Skonto „{value}“ ist kein gültiger Betrag (Komma, zwei Nachkommastellen, größer als null).",
    kost: "{field} „{value}“ ist zu lang oder enthält Sonderzeichen. Erlaubt sind Buchstaben, Ziffern, Leerzeichen und Unterstrich, höchstens 36 Zeichen und nicht mehr als in Ihren KOST-Stammdaten eingestellt.",
    "eu-vat-id": "„{value}“ ist keine gültige USt-IdNr. Erwartet: Länderkennzeichen und Nummer ohne Leerzeichen, etwa ATU12345678.",
    "eu-rate": "EU-Steuersatz „{value}“ ist ungültig. Erwartet wird etwa 20,00.",
    "service-date": "{field} „{value}“ ist kein gültiges Datum im Format TTMMJJJJ.",
    "service-date-period": "Wenn „{a}“ gefüllt ist, muss auch „{b}“ gefüllt sein.",
    "lock-flag": "Festschreibung „{value}“ ist ungültig. Erlaubt sind leer, 0 und 1.",
    "reversal-flag": "Generalumkehr „{value}“ ist ungültig. Erlaubt sind 0 und 1.",
    "tax-rate": "Steuersatz „{value}“ ist ungültig. Erwartet wird etwa 19,00.",
    country: "Land „{value}“ ist kein ISO-Ländercode aus zwei Großbuchstaben, etwa DE oder AT.",
    "person-missing": "Die Kontonummer fehlt. Sie ist das einzige Pflichtfeld für Debitoren und Kreditoren.",
    "person-length":
      "Konto „{value}“ hat die falsche Länge. Bei Sachkontenlänge {skl} haben Personenkonten genau {expected} Stellen.",
    "person-range": "Konto „{value}“ beginnt mit 0 und ist damit kein Personenkonto. Debitoren beginnen mit 1 bis 6, Kreditoren mit 7 bis 9.",
    "person-duplicate": "Konto {value} steht schon in Zeile {first}. Beim Import überschreibt die spätere Zeile die frühere.",
    "addressee-type": "Adressattyp „{value}“ ist ungültig. Erlaubt sind 0 (keine Angabe), 1 (natürliche Person) und 2 (Unternehmen).",
    "name-missing":
      "Für diesen Adressattyp ist „{field}“ leer. DATEV zeigt nur die Namensfelder an, die zum Adressattyp passen, der Name steht vermutlich in der falschen Spalte.",
    "name-length": "{field} ist länger als {max} Zeichen und wird gekürzt.",
    "eu-country": "EU-Land „{value}“ ist kein zweistelliges Länderkennzeichen.",
    "eu-vat-prefix":
      "Die USt-IdNr. „{value}“ beginnt mit dem Länderkennzeichen. In Debitoren/Kreditoren gehört das Kennzeichen ins Feld EU-Land und die Nummer ohne Präfix ins Feld EU-UStID.",
    postcode: "Postleitzahl „{value}“ darf laut Formatbeschreibung nur Ziffern enthalten.",
    iban: "IBAN „{value}“ ist ungültig, die Prüfziffer stimmt nicht. Meist ein Tippfehler oder eine abgeschnittene Nummer.",
  },
  en: {
    empty: "The file is empty.",
    "not-extf":
      "This isn't a DATEV-format file: the first line must start with “EXTF”, but it says “{value}”. DATEV needs the EXTF header with Berater, Mandant, fiscal year and period to import anything.",
    "headings-first":
      "The first line is missing. The file starts straight with the column headings, but the EXTF header with Berater, Mandant, fiscal year and period belongs above them. Without it, DATEV reports that it found no data.",
    "wrong-delimiter":
      "Fields are separated by commas or tabs. DATEV expects semicolons. This usually happens when Excel saves the file with English regional settings.",
    "unclosed-quote":
      "Line {line} opens a quote that never closes, so everything after it ends up in one field. Usually a single \" inside a booking text should have been doubled (\"\").",
    "utf8-without-bom":
      "The file is UTF-8 without a byte order mark. DATEV then reads it as Windows-1252 and umlauts turn into garbage (“Ã¼” instead of “ü”). Save it as ANSI/Windows-1252 or as “UTF-8 with BOM”.",
    "no-headings": "The second line, with the column headings, is missing.",
    "no-rows": "The file has no data rows, only the header and the column headings.",
    "too-many-bookings": "The file has {count} bookings. DATEV takes at most {max} per batch. Split the export.",
    "header-short": "The header has only {count} fields, it should have {expected}. Empty fields still need their semicolons.",
    "header-too-long": "The header is {count} characters long. DATEV's Buchungsdatenservice accepts at most {max}.",
    "header-unquoted":
      "Header field {field} isn't in quotes. DATEV writes text fields as \"{value}\". Many imports tolerate it, but DATEV's own checker flags it.",
    "header-version": "Header version “{value}” is unknown. The current one is 700.",
    "header-version-old": "Header version 510 is outdated; the current one is 700. Newer DATEV releases still read it, but don't rely on that.",
    "header-category": "Format category “{value}” doesn't exist. A Buchungsstapel is 21, Debitoren/Kreditoren is 16.",
    "header-category-unchecked":
      "This is a “{name}” file. Only its header is checked here. Only Buchungsstapel and Debitoren/Kreditoren files are checked line by line.",
    "header-format-name": "Format name “{value}” doesn't match the format category. Expected: “{expected}”.",
    "header-format-version": "Format version “{value}” doesn't fit. Expected: {expected}.",
    "header-format-version-old":
      "Format version {value} is older than the current 13. DATEV still reads it, but fields added later (such as a separate discount account) are missing.",
    "header-created": "“Erzeugt am” must be a 17-digit timestamp (YYYYMMDDHHMMSSmmm), found “{value}”.",
    "header-berater":
      "Beraternummer “{value}” is invalid. Allowed: 1001 to 9999999. If it's valid but belongs to a different firm, DATEV reports “Beraternummer nicht gefunden”.",
    "header-mandant": "Mandantennummer “{value}” is invalid. Allowed: 1 to 99999.",
    "header-wj": "Fiscal year start “{value}” isn't a valid YYYYMMDD date.",
    "header-skl": "Account length “{value}” is invalid. Allowed: 4 to 8, and it must match the client's setting exactly.",
    "header-skl-missing":
      "The account length (Sachkontenlänge) is empty. DATEV then uses the client's setting, which works as long as your account numbers fit it.",
    "header-date": "{field} “{value}” isn't a valid YYYYMMDD date.",
    "header-dates-order": "“Datum bis” ({to}) is before “Datum vom” ({from}).",
    "header-dates-year":
      "“Datum vom” ({from}) and “Datum bis” ({to}) are in different calendar years, which DATEV rejects (#REW04404). Export one batch per calendar year.",
    "header-before-wj": "“Datum vom” ({from}) is before the start of the fiscal year ({wj}).",
    "header-beyond-wj": "“Datum bis” ({to}) is after the end of the fiscal year ({end}).",
    "header-label": "The batch name is longer than {max} characters and gets cut off.",
    "header-festschreibung": "Festschreibung “{value}” is invalid. Allowed: 0 (not locked) and 1.",
    "header-currency": "Currency “{value}” isn't a three-letter ISO code such as EUR.",
    "header-skr": "Chart of accounts “{value}” looks unusual. It's normally two digits, such as 03 or 04.",
    "headings-count":
      "The heading row has {count} columns; this format version has {expected}. DATEV reads columns by position, so one missing column shifts everything after it into the wrong field.",
    "headings-differ":
      "Headings differ from column {field} on: “{value}” instead of “{expected}”. DATEV maps by position, so check whether the columns have shifted.",
    "row-too-many-fields":
      "Line {line} has {count} fields instead of {expected}. Almost always a text contains a semicolon without quotes around it, and every field after it shifts.",
    "row-too-few-fields": "Line {line} has {count} fields instead of {expected}. Empty trailing fields should still have their semicolons.",
    "text-unquoted": "{field} “{value}” isn't in quotes. DATEV expects text fields as \"…\".",
    "text-control": "{field} contains a line break or tab. Control characters aren't allowed in DATEV text fields.",
    "amount-missing": "The amount (Umsatz) is missing. It's a required field.",
    "amount-dot": "Amount “{value}” uses a dot as the decimal separator. DATEV expects a comma: 12.50 becomes 12,50.",
    "amount-negative":
      "Amount “{value}” is negative. DATEV amounts have no sign: the amount is always positive and the direction goes in the Soll/Haben field.",
    "amount-thousands": "Amount “{value}” contains a thousands separator. DATEV expects 1234,56, not 1.234,56.",
    "amount-zero": "The amount is 0,00. DATEV rejects zero bookings.",
    "amount-no-decimals":
      "Amount “{value}” has no decimals. The format description always wants two (100,00). DATEV usually reads it anyway, but the full form is safer.",
    "amount-format": "Amount “{value}” isn't a valid amount. Expected: up to ten digits, a comma and two decimals.",
    side: "Soll/Haben flag “{value}” is invalid. Allowed: S and H, relative to the account.",
    currency: "Currency “{value}” isn't a three-letter ISO code.",
    "fx-pair": "“{a}” and “{b}” go together: if one is filled in, the other must be too.",
    "account-dragged":
      "The account is empty. DATEV then copies it from the line above. That's rarely intended, and in a sorted file it's an error nobody notices.",
    "account-missing": "{field} is empty. It's a required field.",
    "account-format": "{field} “{value}” isn't a valid account number: digits only, at most nine, not all zeros.",
    "account-length":
      "{field} “{value}” is too long. With an account length of {skl}, general ledger accounts have {skl} digits and customer/supplier accounts at most {max}.",
    "account-same": "Account and contra account are both {value}. Booking an account against itself is almost always a mapping error.",
    "bu-format": "Tax key “{value}” is invalid. Allowed: one to four digits.",
    "bu-automatic":
      "Account {account} is an automatic account in SKR{skr}: the tax is built into the account. An extra tax key (“{value}”) there usually ends in “Ungültiger BU-Schlüssel”.",
    "date-missing": "The document date (Belegdatum) is missing. It's a required field.",
    "date-full":
      "Document date “{value}” is a full date. DATEV expects only day and month (DDMM, such as 3101); the year comes from the header.",
    "date-leading-zero":
      "Document date “{value}” has only three digits: the leading zero is gone. That happens when Excel saves the column as a number. It should be {fixed}.",
    "date-invalid": "Document date “{value}” isn't a valid DDMM day.",
    "date-before-wj": "Document date “{value}” is before the start of the fiscal year ({wj}), which DATEV rejects (#REW00314).",
    "date-outside-batch": "Document date “{value}” is outside the batch period ({from} to {to}). Check the date or the period in the header.",
    "beleg1-length": "Belegfeld 1 is longer than {max} characters: “{value}”.",
    "beleg1-chars":
      "Belegfeld 1 “{value}” contains characters DATEV doesn't allow there. Allowed: letters, digits and $ & % * + - /, so no spaces, umlauts, dots or underscores.",
    "beleg1-underscore":
      "Belegfeld 1 “{value}” contains an underscore. DATEV's format rule allows it, but its description doesn't list it. If the import rejects it, drop it.",
    "beleg2-length": "Belegfeld 2 is longer than {max} characters: “{value}”. DATEV's checker allows only {max}.",
    "text-length": "The booking text is longer than {max} characters. DATEV cuts it off on import.",
    skonto: "Discount “{value}” isn't a valid amount (comma, two decimals, above zero).",
    kost: "{field} “{value}” is too long or contains special characters. Allowed: letters, digits, spaces and underscores, at most 36 characters and no more than your cost-centre settings allow.",
    "eu-vat-id": "“{value}” isn't a valid VAT ID. Expected: country code plus number, no spaces, such as ATU12345678.",
    "eu-rate": "EU tax rate “{value}” is invalid. Expected something like 20,00.",
    "service-date": "{field} “{value}” isn't a valid DDMMYYYY date.",
    "service-date-period": "When “{a}” is filled in, “{b}” must be too.",
    "lock-flag": "Festschreibung “{value}” is invalid. Allowed: empty, 0 and 1.",
    "reversal-flag": "Generalumkehr “{value}” is invalid. Allowed: 0 and 1.",
    "tax-rate": "Tax rate “{value}” is invalid. Expected something like 19,00.",
    country: "Country “{value}” isn't a two-letter ISO code such as DE or AT.",
    "person-missing": "The account number is missing. It's the only required field for customers and suppliers.",
    "person-length": "Account “{value}” has the wrong length. With an account length of {skl}, customer and supplier accounts have exactly {expected} digits.",
    "person-range": "Account “{value}” starts with 0, so it isn't a customer or supplier account. Customers start with 1 to 6, suppliers with 7 to 9.",
    "person-duplicate": "Account {value} already appears in line {first}. On import, the later line overwrites the earlier one.",
    "addressee-type": "Addressee type “{value}” is invalid. Allowed: 0 (not specified), 1 (person) and 2 (company).",
    "name-missing":
      "“{field}” is empty for this addressee type. DATEV only shows the name fields that match the type, so the name is probably in the wrong column.",
    "name-length": "{field} is longer than {max} characters and gets cut off.",
    "eu-country": "EU country “{value}” isn't a two-letter country code.",
    "eu-vat-prefix":
      "VAT ID “{value}” starts with the country code. In Debitoren/Kreditoren files the code goes into EU-Land and the number without prefix into EU-UStID.",
    postcode: "Postcode “{value}” may only contain digits.",
    iban: "IBAN “{value}” is invalid: the check digits don't match. Usually a typo or a truncated number.",
  },
};

const DATE_PARAMS = new Set(["from", "to", "wj", "end"]);

/** YYYYMMDD as a local date, anything else unchanged. */
const showDate = (value: string, lang: Lang) =>
  value.replace(/^(\d{4})(\d{2})(\d{2})$/, lang === "de" ? "$3.$2.$1" : "$3/$2/$1");

/** The finding as a sentence in German or English. */
export function formatFinding(finding: Finding, lang: Lang = "de"): string {
  const values: Record<string, string | number | undefined> = {
    line: finding.line,
    field: finding.fieldName ?? finding.field,
    value: finding.value,
  };
  for (const [key, value] of Object.entries(finding.params ?? {})) {
    values[key] = DATE_PARAMS.has(key) && typeof value === "string" ? showDate(value, lang) : value;
  }
  return messages[lang][finding.code].replace(/\{(\w+)\}/g, (match, key: string) =>
    values[key] === undefined ? match : String(values[key]),
  );
}
