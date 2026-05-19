// POST /api/admin/closing/leads/clear — admin-only. Wipes every stored
// closing lead (the Edge Config `closing_leads` key). Used to flush test
// bookings without manually pruning each one.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import {
  clearStoredLeads,
  readStoredLeads,
} from "@/lib/closing-leads-store";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const before = (await readStoredLeads()).length;
  try {
    await clearStoredLeads();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to clear" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, deleted: before });
}
