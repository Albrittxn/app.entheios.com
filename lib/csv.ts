// Minimal RFC-ish CSV parser plus an XLSX dispatcher. Handles quoted
// fields, escaped quotes ("") inside quoted fields, and \r\n. Not a full
// RFC 4180 implementation — good enough for browser-side preview + column
// validation.

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  rowCount: number;
};

// Parses a CSV (.csv) OR XLSX (.xlsx/.xls) browser File into the same shape.
// XLSX support is loaded on-demand via dynamic import so it doesn't bloat
// the initial bundle.
export async function parseSheet(file: File): Promise<ParsedCsv> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = stripBom(await file.text());
    return parseCsv(text);
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const xlsx = await import("xlsx");
    const wb = xlsx.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { headers: [], rows: [], rowCount: 0 };
    const ws = wb.Sheets[sheetName];
    const aoa = xlsx.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: "",
      raw: false,
    });
    if (!aoa.length) return { headers: [], rows: [], rowCount: 0 };
    const headers = (aoa[0] ?? []).map((c) => String(c ?? "").trim());
    const rows = aoa
      .slice(1)
      .map((r) => (r ?? []).map((c) => String(c ?? "").trim()))
      .filter((r) => r.some((c) => c.length));
    return { headers, rows, rowCount: rows.length };
  }
  throw new Error("Unsupported file type. Use .csv or .xlsx.");
}

export function parseCsv(text: string, delimiter: string = ","): ParsedCsv {
  const cleaned = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === '"') {
      // Track quote state at the line level so a line break inside a
      // quoted field doesn't end the row.
      inQuotes = !inQuotes;
      buf += c;
    } else if (c === "\n" && !inQuotes) {
      if (buf.length) lines.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  if (buf.length) lines.push(buf);

  if (!lines.length) return { headers: [], rows: [], rowCount: 0 };

  const headers = parseLine(lines[0], delimiter);
  const rows = lines
    .slice(1)
    .map((l) => parseLine(l, delimiter))
    .filter((r) => r.some((c) => c.length));
  return { headers, rows, rowCount: rows.length };
}

// Auto-detects whether the text is tab- or comma-delimited (pasting from
// Excel / Google Sheets gives you tabs; pasting from a saved CSV file gives
// you commas). Falls back to comma.
export function parseDelimitedText(text: string): ParsedCsv {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length) ?? "";
  // Don't count tabs/commas inside quoted regions for detection.
  let tabs = 0;
  let commas = 0;
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch === "\t") tabs++;
    else if (!inQ && ch === ",") commas++;
  }
  const delimiter = tabs > commas ? "\t" : ",";
  return parseCsv(text, delimiter);
}

function parseLine(line: string, delimiter: string = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

// Normalize a header for fuzzy matching: lowercase, alphanumeric only.
// "First Name" / "first_name" / "firstName" all → "firstname".
export function normalizeHeader(h: string): string {
  return stripBom(h).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

export const REQUIRED_COLUMNS = [
  { key: "firstName", label: "First name", aliases: ["firstname"] },
  { key: "lastName", label: "Last name", aliases: ["lastname"] },
  { key: "email", label: "Email", aliases: ["email"] },
  { key: "phone", label: "Phone", aliases: ["phone", "phonenumber", "mobile"] },
  {
    key: "brokerage",
    label: "Brokerage",
    aliases: [
      "brokerage",
      "brokerageoffice",
      "office",
      "company",
      "companyname",
      "companyoffice",
      "companybrokerage",
    ],
  },
  { key: "state", label: "State", aliases: ["state"] },
] as const;

export type ColumnMap = Record<(typeof REQUIRED_COLUMNS)[number]["key"], number | null>;

// Match required columns to CSV headers by normalized name. Returns
// indexes (or null) and the list of missing required keys.
export function matchColumns(headers: string[]): {
  map: ColumnMap;
  missing: string[];
} {
  const normalized = headers.map(normalizeHeader);
  const map = {} as ColumnMap;
  const missing: string[] = [];
  for (const col of REQUIRED_COLUMNS) {
    const idx = normalized.findIndex((h) =>
      (col.aliases as readonly string[]).includes(h),
    );
    map[col.key] = idx >= 0 ? idx : null;
    if (idx < 0) missing.push(col.label);
  }
  return { map, missing };
}
