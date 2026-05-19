// Allowlist + admin role + per-user profile (display name).
//
// Storage: Vercel Edge Config — single key `allowed_emails` holding an array
// of `{ email, added_at, name? }` objects. Reads are free + fast at the edge;
// writes go through the Vercel REST API (admin add/remove + first-login
// name capture).
//
// Admin is hardcoded to ryan@entheios.com so a stray DELETE can't lock us out.

import { get } from "@vercel/edge-config";
import { kvGet, kvPut } from "./store";

export const ADMIN_EMAIL = "ryan@entheios.com";

// Edge Config writes go through the Vercel REST API, which needs these three
// env vars. They're absent in local dev — when so, user profile changes
// (display name) fall back to the file-backed KV store instead.
function edgeConfigWritable(): boolean {
  return Boolean(
    process.env.EDGE_CONFIG_ID &&
      process.env.VERCEL_TEAM_ID &&
      process.env.VERCEL_API_TOKEN,
  );
}

function localNameKey(email: string): string {
  return `user-name:${email.toLowerCase().trim()}`;
}

export type AllowedEmail = {
  email: string;
  added_at: string;
  /** Display name captured on first sign-in. Undefined for users who
   *  haven't completed onboarding yet. */
  name?: string;
  timezone?: string;
};

export function isAdminEmail(email: string | undefined | null): boolean {
  return Boolean(email && email.toLowerCase() === ADMIN_EMAIL);
}

async function readEmails(): Promise<AllowedEmail[]> {
  // `get` reads from the EDGE_CONFIG connection string env var. Returns
  // undefined if the key doesn't exist yet.
  const raw = await get<unknown>("allowed_emails");
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is AllowedEmail => {
      return (
        !!r &&
        typeof r === "object" &&
        typeof (r as { email?: unknown }).email === "string"
      );
    })
    .map((r) => {
      const name = typeof r.name === "string" ? r.name.trim() : undefined;
      const timezone =
        typeof (r as { timezone?: unknown }).timezone === "string"
          ? (r as { timezone: string }).timezone.trim()
          : undefined;
      return {
        email: r.email.toLowerCase(),
        added_at: typeof r.added_at === "string" ? r.added_at : new Date().toISOString(),
        ...(name ? { name } : {}),
        ...(timezone ? { timezone } : {}),
      };
    });
}

export async function isAllowed(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  const e = email.toLowerCase();
  if (e === ADMIN_EMAIL) return true;
  const list = await readEmails();
  return list.some((r) => r.email === e);
}

export async function getUserRecord(
  email: string | undefined | null,
): Promise<AllowedEmail | null> {
  if (!email) return null;
  const e = email.toLowerCase();
  const list = await readEmails();
  let row = list.find((r) => r.email === e) ?? null;
  // Admin is always allowed even if not yet in the list — return a placeholder
  // row so the header has something to render.
  if (!row && e === ADMIN_EMAIL) {
    row = { email: ADMIN_EMAIL, added_at: new Date(0).toISOString() };
  }
  if (!row) return null;
  // Local dev: the display name, profile picture, and timezone live in the
  // file-backed KV store because there's no Edge Config to write to. Overlay on read.
  if (!edgeConfigWritable()) {
    const local = await kvGet<{
      name?: string;
      timezone?: string;
    }>(localNameKey(e));
    if (local) {
      if (local.name) row = { ...row, name: local.name };
      if (local.timezone) row = { ...row, timezone: local.timezone };
    }
  }
  return row;
}

export async function listAllowedEmails(): Promise<AllowedEmail[]> {
  const list = await readEmails();
  // Make sure admin is always present at the top, even if Edge Config got
  // wiped. The runtime allowlist check special-cases admin anyway.
  const withoutAdmin = list.filter((r) => r.email !== ADMIN_EMAIL);
  const adminRow = list.find((r) => r.email === ADMIN_EMAIL) ?? {
    email: ADMIN_EMAIL,
    added_at: new Date(0).toISOString(),
  };
  return [adminRow, ...withoutAdmin].sort((a, b) => {
    if (a.email === ADMIN_EMAIL) return -1;
    if (b.email === ADMIN_EMAIL) return 1;
    return b.added_at.localeCompare(a.added_at);
  });
}

// Writes go through the Vercel REST API (PATCH /v1/edge-config/.../items).
async function writeEmails(emails: AllowedEmail[]): Promise<void> {
  const id = process.env.EDGE_CONFIG_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const token = process.env.VERCEL_API_TOKEN;
  if (!id || !teamId || !token) {
    throw new Error(
      "Edge Config write env vars missing (EDGE_CONFIG_ID, VERCEL_TEAM_ID, VERCEL_API_TOKEN).",
    );
  }
  const url = `https://api.vercel.com/v1/edge-config/${id}/items?teamId=${teamId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: "allowed_emails", value: emails }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Edge Config write failed (${res.status}): ${body}`);
  }
}

export async function addAllowedEmail(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  if (!email) throw new Error("Email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("That doesn't look like a valid email.");
  }
  const list = await readEmails();
  if (list.some((r) => r.email === email)) return; // already there
  const next = [...list, { email, added_at: new Date().toISOString() }];
  await writeEmails(next);
}

export async function removeAllowedEmail(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  if (email === ADMIN_EMAIL) throw new Error("Cannot remove the admin.");
  const list = await readEmails();
  const next = list.filter((r) => r.email !== email);
  if (next.length === list.length) return; // wasn't there
  await writeEmails(next);
}

// Sets (or replaces) the display name for an existing allowlisted email.
// Admin is upserted into the list on first call if not already present.
export async function setUserName(
  rawEmail: string,
  rawName: string,
): Promise<AllowedEmail> {
  const email = rawEmail.toLowerCase().trim();
  const name = rawName.trim();
  if (!email) throw new Error("Email is required.");
  if (!name) throw new Error("Name is required.");
  if (name.length > 64) throw new Error("Name is too long (max 64 chars).");

  // Local dev (no Edge Config write creds): persist the name in the
  // file-backed KV store. getUserRecord overlays it on read.
  if (!edgeConfigWritable()) {
    await kvPut(localNameKey(email), { name });
    const list = await readEmails();
    const existing = list.find((r) => r.email === email);
    return {
      email,
      added_at: existing?.added_at ?? new Date(0).toISOString(),
      name,
    };
  }

  const list = await readEmails();
  const existing = list.find((r) => r.email === email);
  let next: AllowedEmail[];
  let row: AllowedEmail;
  if (existing) {
    row = { ...existing, name };
    next = list.map((r) => (r.email === email ? row : r));
  } else if (email === ADMIN_EMAIL) {
    row = { email, added_at: new Date().toISOString(), name };
    next = [...list, row];
  } else {
    throw new Error("Email is not on the allowlist.");
  }
  await writeEmails(next);
  return row;
}

export async function updateUserProfile(
  rawEmail: string,
  updates: { name?: string; timezone?: string },
): Promise<AllowedEmail> {
  const email = rawEmail.toLowerCase().trim();
  if (!email) throw new Error("Email is required.");

  const name = updates.name?.trim();
  const timezone = updates.timezone?.trim();

  if (name && name.length > 64) throw new Error("Name is too long (max 64 chars).");
  if (timezone && timezone.length > 64) throw new Error("Timezone is too long.");

  const patch: Partial<AllowedEmail> = {};
  if (name !== undefined) patch.name = name || undefined;
  if (timezone !== undefined) patch.timezone = timezone || undefined;

  // Local dev (no Edge Config write creds): persist in the file-backed KV store.
  if (!edgeConfigWritable()) {
    const key = localNameKey(email);
    const existingLocal = (await kvGet<{
      name?: string;
      timezone?: string;
    }>(key)) ?? {};
    const updatedLocal = { ...existingLocal, ...patch };
    await kvPut(key, updatedLocal);

    const list = await readEmails();
    const existing = list.find((r) => r.email === email);
    return {
      email,
      added_at: existing?.added_at ?? new Date(0).toISOString(),
      name: updatedLocal.name,
      timezone: updatedLocal.timezone,
    };
  }

  const list = await readEmails();
  const existing = list.find((r) => r.email === email);
  let next: AllowedEmail[];
  let row: AllowedEmail;
  if (existing) {
    row = { ...existing, ...patch };
    next = list.map((r) => (r.email === email ? row : r));
  } else if (email === ADMIN_EMAIL) {
    row = { email, added_at: new Date().toISOString(), ...patch };
    next = [...list, row];
  } else {
    throw new Error("Email is not on the allowlist.");
  }
  await writeEmails(next);
  return row;
}
