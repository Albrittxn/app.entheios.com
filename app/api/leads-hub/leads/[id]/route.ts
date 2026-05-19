import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteLeadsHubLead } from "@/lib/leads-hub-store";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId");
  if (!batchId) {
    return NextResponse.json({ error: "batchId query param required" }, { status: 400 });
  }

  await deleteLeadsHubLead(batchId, params.id);
  return NextResponse.json({ ok: true });
}
