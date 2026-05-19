import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { getSession } from "@/lib/auth";
import {
  getLeadsHubAllLeads,
  getLeadsHubBatch,
  restoreLeadsHubLead,
  type LeadsHubLead,
} from "@/lib/leads-hub-store";

export async function GET(req: Request) {
  const ctx = await getEffectiveUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId");

  if (batchId) {
    const leads = await getLeadsHubBatch(batchId);
    return NextResponse.json({ leads });
  }

  const leads = await getLeadsHubAllLeads();
  return NextResponse.json({ leads });
}

// POST to restore a single deleted lead (Undo action)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lead = body as LeadsHubLead;
  if (!lead.id || !lead.batchId) {
    return NextResponse.json({ error: "Invalid lead data" }, { status: 400 });
  }

  await restoreLeadsHubLead(lead);
  return NextResponse.json({ ok: true, lead });
}
