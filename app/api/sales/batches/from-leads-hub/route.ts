import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { addBatch, randomId, type BatchMeta } from "@/lib/sales-batches";
import {
  getLeadsHubBatch,
  listLeadsHubBatches,
  type LeadsHubLead,
} from "@/lib/leads-hub-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { sourceBatchId?: unknown; name?: unknown };
  const sourceBatchId = typeof payload.sourceBatchId === "string" ? payload.sourceBatchId.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 120) : "";

  if (!sourceBatchId) {
    return NextResponse.json({ error: "sourceBatchId required" }, { status: 400 });
  }

  const sourceBatches = await listLeadsHubBatches();
  const source = sourceBatches.find((b) => b.id === sourceBatchId);
  if (!source) {
    return NextResponse.json({ error: "Leads Hub batch not found" }, { status: 404 });
  }

  const leads = await getLeadsHubBatch(sourceBatchId);
  if (leads.length === 0) {
    return NextResponse.json({ error: "Selected batch has no leads" }, { status: 400 });
  }

  const rows = leads.map((lead: LeadsHubLead) => [
    lead.firstName,
    lead.lastName,
    lead.phone,
    lead.email,
    lead.brokerage,
    lead.state,
  ]);

  const meta: BatchMeta = {
    id: randomId(),
    name: name || source.name,
    lead_count: rows.length,
    columns: ["First Name", "Last Name", "Phone", "Email", "Brokerage", "State"],
    created_at: Date.now(),
    created_by: session.email.toLowerCase(),
  };

  await addBatch(meta, rows);
  return NextResponse.json({ ok: true, batch: meta, sourceBatch: source });
}
