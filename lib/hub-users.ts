// Hub-aware allowlist operations. Layers on top of lib/permissions.ts —
// each user record can carry an extra `hubs: HubId[]` array. Admin auto-gets
// all hubs (see lib/hub-access.ts).
//
// Why this lives separately: permissions.ts is the existing atlas allowlist
// surface and we want to leave its read shape (`AllowedEmail` w/ no `hubs`)
// untouched. Here we re-read the raw records and treat `hubs` as first-class.

import { get } from "@vercel/edge-config";
import { ADMIN_EMAIL } from "@/lib/permissions";
import { HUB_ORDER, type HubId } from "@/lib/hubs";

export type RawUser = {
  email: string;
  added_at: string;
  name?: string;
  hubs?: HubId[];
  timezone?: string;
};

function sanitizeHubs(raw: unknown): HubId[] {
  if (!Array.isArray(raw)) return [];
  const out: HubId[] = [];
  for (const item of raw) {
    if (typeof item === "string" && (HUB_ORDER as string[]).includes(item)) {
      out.push(item as HubId);
    }
  }
  return out;
}

async function readUsers(): Promise<RawUser[]> {
  if (!process.env.EDGE_CONFIG) return [];
  let raw: unknown;
  try {
    raw = await get<unknown>("allowed_emails");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is RawUser =>
        !!r && typeof r === "object" && typeof (r as { email?: unknown }).email === "string",
    )
    .map((r) => {
      const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : undefined;
      const timezone =
        typeof (r as { timezone?: unknown }).timezone === "string"
          ? (r as { timezone: string }).timezone.trim()
          : undefined;
      return {
        email: r.email.toLowerCase(),
        added_at: typeof r.added_at === "string" ? r.added_at : new Date().toISOString(),
        ...(name ? { name } : {}),
        hubs: sanitizeHubs((r as { hubs?: unknown }).hubs),
        ...(timezone ? { timezone } : {}),
      };
    });
}

async function writeUsers(users: RawUser[]): Promise<void> {
  const id = process.env.EDGE_CONFIG_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const token = process.env.VERCEL_API_TOKEN;
  if (!id || !teamId || !token) {
    throw new Error(
      "Edge Config write env vars missing (EDGE_CONFIG_ID, VERCEL_TEAM_ID, VERCEL_API_TOKEN).",
    );
  }
  const url = `https://api.vercel.com/v1/edge-config/${id}/items?teamId=${teamId}`;
  // Drop empty hubs arrays so they don't clutter storage
  const payload = users.map((u) => {
    const next: RawUser = {
      email: u.email,
      added_at: u.added_at,
      ...(u.name ? { name: u.name } : {}),
      ...(u.timezone ? { timezone: u.timezone } : {}),
    };
    if (u.hubs && u.hubs.length) next.hubs = u.hubs;
    return next;
  });
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: "allowed_emails", value: payload }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Edge Config write failed (${res.status}): ${body}`);
  }
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

/** Users who currently have access to `hub`. Admin always shows up. */
export async function listUsersForHub(hub: HubId): Promise<RawUser[]> {
  const all = await readUsers();
  const filtered = all.filter((u) => u.email === ADMIN_EMAIL || (u.hubs ?? []).includes(hub));
  return filtered.sort((a, b) => {
    if (a.email === ADMIN_EMAIL) return -1;
    if (b.email === ADMIN_EMAIL) return 1;
    return b.added_at.localeCompare(a.added_at);
  });
}

/** Every hub's user list in a single read — { [hub]: RawUser[] }. The super
 *  admin is synthesized into every hub (and listed first) so it's always a
 *  valid "preview as" target even before other users are added. */
export async function listUsersByHub(): Promise<Record<HubId, RawUser[]>> {
  const all = await readUsers();
  const adminRow: RawUser =
    all.find((u) => u.email === ADMIN_EMAIL) ??
    ({ email: ADMIN_EMAIL, added_at: new Date(0).toISOString() } as RawUser);
  const out = {} as Record<HubId, RawUser[]>;
  for (const hub of HUB_ORDER) {
    const others = all
      .filter((u) => u.email !== ADMIN_EMAIL && (u.hubs ?? []).includes(hub))
      .sort((a, b) => b.added_at.localeCompare(a.added_at));
    out[hub] = [adminRow, ...others];
  }
  return out;
}

function capitalizeWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildDisplayName(firstName?: string, lastName?: string): string | undefined {
  const first = capitalizeWord((firstName ?? "").trim());
  const last = capitalizeWord((lastName ?? "").trim());
  const joined = [first, last].filter(Boolean).join(" ");
  return joined || undefined;
}

/** Add a user to this hub. Creates an allowlist entry if new; otherwise adds
 *  the hub to their existing hub list. If a name is provided, it's set (or
 *  updated) on the user record. */
export async function addUserToHub(
  rawEmail: string,
  hub: HubId,
  opts?: { firstName?: string; lastName?: string },
): Promise<RawUser> {
  const email = rawEmail.toLowerCase().trim();
  if (!email) throw new Error("Email is required.");
  if (!isValidEmail(email)) throw new Error("That doesn't look like a valid email.");
  const displayName = buildDisplayName(opts?.firstName, opts?.lastName);
  if (email === ADMIN_EMAIL) {
    // Admin already has everything; no-op
    return { email, added_at: new Date(0).toISOString(), hubs: [...HUB_ORDER] };
  }
  const users = await readUsers();
  const existing = users.find((u) => u.email === email);
  let next: RawUser[];
  let row: RawUser;
  if (existing) {
    const merged = Array.from(new Set([...(existing.hubs ?? []), hub])) as HubId[];
    row = { ...existing, hubs: merged, ...(displayName ? { name: displayName } : {}) };
    next = users.map((u) => (u.email === email ? row : u));
  } else {
    row = {
      email,
      added_at: new Date().toISOString(),
      hubs: [hub],
      ...(displayName ? { name: displayName } : {}),
    };
    next = [...users, row];
  }
  await writeUsers(next);
  return row;
}

/** Remove this hub from a user's access. Leaves them in the allowlist
 *  (they may still have other hubs). */
export async function removeUserFromHub(rawEmail: string, hub: HubId): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  if (email === ADMIN_EMAIL) throw new Error("Cannot remove the super admin from a hub.");
  const users = await readUsers();
  const next = users.map((u) =>
    u.email === email ? { ...u, hubs: (u.hubs ?? []).filter((h) => h !== hub) } : u,
  );
  await writeUsers(next);
}
