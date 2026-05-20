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

  const payload = body as { sourceBatchId?: unknown; sourceBatchIds?: unknown };
  const singleId = typeof payload.sourceBatchId === "string" ? payload.sourceBatchId.trim() : "";
  const multiIds = Array.isArray(payload.sourceBatchIds)
    ? payload.sourceBatchIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean)
    : [];
  const sourceBatchIds = [...new Set([singleId, ...multiIds].filter(Boolean))];

  if (sourceBatchIds.length === 0) {
    return NextResponse.json({ error: "sourceBatchId(s) required" }, { status: 400 });
  }

  const sourceBatches = await listLeadsHubBatches();
  const batchById = new Map(sourceBatches.map((batch) => [batch.id, batch] as const));
  const resolvedSources = await Promise.all(
    sourceBatchIds.map(async (sourceBatchId) => {
      const source = batchById.get(sourceBatchId);
      if (!source) {
        return { ok: false as const, error: `Leads Hub batch not found: ${sourceBatchId}` };
      }

      const leads = await getLeadsHubBatch(sourceBatchId);
      if (leads.length === 0) {
        return { ok: false as const, error: `Selected batch has no leads: ${source.name}` };
      }

      return { ok: true as const, source, leads };
    }),
  );

  const firstFailure = resolvedSources.find((result) => !result.ok);
  if (firstFailure && !firstFailure.ok) {
    return NextResponse.json({ error: firstFailure.error }, { status: 400 });
  }

  const created: BatchMeta[] = [];

  for (const result of resolvedSources) {
    if (!result.ok) continue;
    const { source, leads } = result;
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
      name: source.name,
      lead_count: rows.length,
      columns: ["First Name", "Last Name", "Phone", "Email", "Brokerage", "State"],
      created_at: Date.now(),
      created_by: session.email.toLowerCase(),
    };

    await addBatch(meta, rows);
    created.push(meta);
  }

  return NextResponse.json({ ok: true, batches: created });
}
