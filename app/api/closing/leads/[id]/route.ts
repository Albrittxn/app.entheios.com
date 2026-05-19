// PATCH /api/closing/leads/:id — closer saves status / objections / follow-up
// date / notes. Auth gate is handled by proxy.ts (only allows authed sessions).

import { NextResponse } from "next/server";
import { deleteLead, patchLead, readStoredLeads } from "@/lib/closing-leads-store";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import {
  LEAD_OBJECTIONS,
  LEAD_STATUSES,
  type Lead,
  type LeadObjection,
  type LeadStatus,
} from "@/lib/closing-leads";

export const runtime = "nodejs";

const STATUS_SET = new Set<string>(LEAD_STATUSES);
const OBJECTION_SET = new Set<string>(LEAD_OBJECTIONS);

function sanitize(body: unknown): Partial<Lead> {
  const patch: Partial<Lead> = {};
  if (!body || typeof body !== "object") return patch;
  const b = body as Record<string, unknown>;

  if (typeof b.status === "string" && STATUS_SET.has(b.status)) {
    patch.status = b.status as LeadStatus;
  }
  if (Array.isArray(b.objections)) {
    patch.objections = b.objections.filter(
      (o): o is LeadObjection => typeof o === "string" && OBJECTION_SET.has(o),
    );
  }
  if (typeof b.followUpDate === "string") {
    // YYYY-MM-DD; allow empty string to clear
    patch.followUpDate = b.followUpDate;
  }
  if (typeof b.notes === "string") {
    patch.notes = b.notes;
  }
  return patch;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const all = await readStoredLeads();
  if (!all.find((l) => l.id === id)) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = sanitize(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  patch.updatedAt = new Date().toISOString();

  try {
    await patchLead(id, patch);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const session = await getSession();
  if (!session?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const all = await readStoredLeads();
  if (!all.find((l) => l.id === id)) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    await deleteLead(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
