// Lead field normalization, applied at import time so the master list stays
// consistent no matter how messy the source data is. Each formatter is a
// pure string → string transform with a sensible fallback when the input
// can't be parsed.

/** "marcus", "MARCUS", "Marcus  Reyes" → "Marcus", "Marcus Reyes".
 *  Preserves hyphens ("mary-jane" → "Mary-Jane") and apostrophes
 *  ("o'brien" → "O'Brien"). Simple title case — does not try to fix
 *  irregularly-capitalized names like McDonald (you'd get "Mcdonald"). */
export function formatName(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part
            .split("'")
            .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
            .join("'"),
        )
        .join("-"),
    )
    .join(" ");
}

/** Strips everything non-numeric, drops a leading US country code "1",
 *  and re-emits as "(XXX) XXX-XXXX". If the result isn't 10 digits, returns
 *  the trimmed original so we don't silently mangle international or
 *  unusual numbers. */
export function formatPhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw.trim();
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/** Lowercases and trims. */
export function formatEmail(raw: string): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Trims only — keeps brand casing like "RE/MAX", "Keller Williams". */
export function formatBrokerage(raw: string): string {
  return (raw ?? "").trim();
}

// US states + DC. Keys are normalized (lowercase, no spaces or punctuation).
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  districtofcolumbia: "DC",
  washingtondc: "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  newhampshire: "NH",
  newjersey: "NJ",
  newmexico: "NM",
  newyork: "NY",
  northcarolina: "NC",
  northdakota: "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  rhodeisland: "RI",
  southcarolina: "SC",
  southdakota: "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  westvirginia: "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

const VALID_CODES = new Set(Object.values(STATE_NAME_TO_CODE));

/** Anything that resolves to a US state → 2-letter uppercase code.
 *  Accepts "Texas", "texas", "TX", "tx", "T.X.", etc. If we can't
 *  recognize it, returns the input uppercased + trimmed. */
export function formatState(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Strip whitespace, dots, and other punctuation for the lookup key.
  const key = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  if (key.length === 2 && VALID_CODES.has(key.toUpperCase())) {
    return key.toUpperCase();
  }
  const code = STATE_NAME_TO_CODE[key];
  if (code) return code;
  // Unknown state — return uppercased trimmed input as fallback.
  return trimmed.toUpperCase();
}
