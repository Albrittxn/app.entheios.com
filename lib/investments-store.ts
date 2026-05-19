// Per-user investment records for the Investing hub.
//
// Storage: Edge Config (single key `investments`, array of records) when the
// write env vars are present; otherwise file-backed KV for local dev.
//
// Records are keyed by email. Admin controls invested amount + projected
// growth percentages over 1w / 4w / 3mo windows. Reads are scoped to the
// effective user.

import { get } from "@vercel/edge-config";
import { kvGet, kvPut } from "./store";

const STORE_KEY = "investments";
const LOCAL_KEY = "investments";

export type InvestmentRecord = {
  email: string;
  /** Amount currently invested in Entheios, in USD. */
  invested: number;
  /** Projected growth percentages — e.g. 2.5 means +2.5%. */
  growth1w: number;
  growth4w: number;
  growth3mo: number;
  updatedAt: string;
};

function edgeConfigWritable(): boolean {
  return Boolean(
    process.env.EDGE_CONFIG_ID &&
      process.env.VERCEL_TEAM_ID &&
      process.env.VERCEL_API_TOKEN,
  );
}

function toRecord(r: unknown): InvestmentRecord | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  if (typeof o.email !== "string") return null;
  return {
    email: o.email.toLowerCase(),
    invested: typeof o.invested === "number" ? o.invested : 0,
    growth1w: typeof o.growth1w === "number" ? o.growth1w : 0,
    growth4w: typeof o.growth4w === "number" ? o.growth4w : 0,
    growth3mo: typeof o.growth3mo === "number" ? o.growth3mo : 0,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

export async function readAllInvestments(): Promise<InvestmentRecord[]> {
  if (process.env.EDGE_CONFIG) {
    try {
      const raw = await get<unknown>(STORE_KEY);
      if (Array.isArray(raw)) {
        return raw.map(toRecord).filter((r): r is InvestmentRecord => !!r);
      }
    } catch {
      // fall through to local store
    }
  }
  const local = await kvGet<InvestmentRecord[]>(LOCAL_KEY);
  if (Array.isArray(local)) {
    return local.map(toRecord).filter((r): r is InvestmentRecord => !!r);
  }
  return [];
}

export async function getInvestmentFor(
  email: string | undefined | null,
): Promise<InvestmentRecord | null> {
  if (!email) return null;
  const e = email.toLowerCase();
  const all = await readAllInvestments();
  return all.find((r) => r.email === e) ?? null;
}

async function writeAll(records: InvestmentRecord[]): Promise<void> {
  if (edgeConfigWritable()) {
    const id = process.env.EDGE_CONFIG_ID;
    const teamId = process.env.VERCEL_TEAM_ID;
    const token = process.env.VERCEL_API_TOKEN;
    const url = `https://api.vercel.com/v1/edge-config/${id}/items?teamId=${teamId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ operation: "upsert", key: STORE_KEY, value: records }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Edge Config write failed (${res.status}): ${body}`);
    }
    return;
  }
  await kvPut(LOCAL_KEY, records);
}

export async function upsertInvestment(
  rawEmail: string,
  patch: Partial<Omit<InvestmentRecord, "email" | "updatedAt">>,
): Promise<InvestmentRecord> {
  const email = rawEmail.toLowerCase().trim();
  if (!email) throw new Error("Email is required.");
  const all = await readAllInvestments();
  const existing = all.find((r) => r.email === email);
  const next: InvestmentRecord = {
    email,
    invested: patch.invested ?? existing?.invested ?? 0,
    growth1w: patch.growth1w ?? existing?.growth1w ?? 0,
    growth4w: patch.growth4w ?? existing?.growth4w ?? 0,
    growth3mo: patch.growth3mo ?? existing?.growth3mo ?? 0,
    updatedAt: new Date().toISOString(),
  };
  const merged = existing
    ? all.map((r) => (r.email === email ? next : r))
    : [...all, next];
  await writeAll(merged);
  return next;
}

export async function deleteInvestment(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  const all = await readAllInvestments();
  const next = all.filter((r) => r.email !== email);
  if (next.length === all.length) return;
  await writeAll(next);
}
