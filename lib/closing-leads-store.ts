// Edge Config-backed persistence for Closing → Calls leads.
// Cal.com webhook upserts here (keyed by booking uid). The closing/calls
// page reads from here and just shows its empty state when there's nothing.
//
// Mirrors the pattern in lib/hub-users.ts — Edge Config reads via the SDK,
// writes via Vercel REST API.

import { get } from "@vercel/edge-config";
import type { Lead } from "@/lib/closing-leads";

const STORE_KEY = "closing_leads";

export async function readStoredLeads(): Promise<Lead[]> {
  if (!process.env.EDGE_CONFIG) return [];
  try {
    const raw = await get<unknown>(STORE_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (r): r is Lead =>
        !!r && typeof r === "object" && typeof (r as { id?: unknown }).id === "string",
    );
  } catch {
    return [];
  }
}

async function writeStoredLeads(leads: Lead[]): Promise<void> {
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
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: STORE_KEY, value: leads }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Edge Config write failed (${res.status}): ${body}`);
  }
}

// Wipe the entire stored leads list. Admin-only maintenance — used to clean
// out test bookings. Cancelled / re-delivered webhook events will repopulate
// the store as new bookings come in.
export async function clearStoredLeads(): Promise<void> {
  await writeStoredLeads([]);
}

// Upsert keyed by id. New leads get appended; existing leads are merged so
// closer-edited fields (status/objections/followUpDate/notes) aren't clobbered
// by re-deliveries of the same booking.
export async function upsertLead(incoming: Lead): Promise<void> {
  const all = await readStoredLeads();
  const idx = all.findIndex((l) => l.id === incoming.id);
  if (idx === -1) {
    all.push({ ...incoming, createdAt: incoming.createdAt ?? new Date().toISOString() });
  } else {
    const prev = all[idx];
    all[idx] = {
      ...incoming,
      // preserve original booking time
      createdAt: prev.createdAt ?? incoming.createdAt ?? new Date().toISOString(),
      // preserve closer edits
      status: prev.status !== "Booked" ? prev.status : incoming.status,
      objections: prev.objections?.length ? prev.objections : incoming.objections,
      followUpDate: prev.followUpDate ?? incoming.followUpDate,
      notes: prev.notes || incoming.notes,
    };
  }
  await writeStoredLeads(all);
}

export async function patchLead(id: string, patch: Partial<Lead>): Promise<void> {
  const all = await readStoredLeads();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch };
  await writeStoredLeads(all);
}
