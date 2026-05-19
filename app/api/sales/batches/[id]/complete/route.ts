// POST   → mark complete for current user
// DELETE → unmark complete
import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { getUserBatchStatus, putUserBatchStatus } from "@/lib/sales-batches";

async function flip(req: Request, params: { id: string }, completed: boolean) {
  const ctx = await getEffectiveUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.impersonating)
    return NextResponse.json({ error: "Read-only while previewing as another user" }, { status: 403 });
  const status = await getUserBatchStatus(ctx.effectiveEmail, params.id);
  if (completed) {
    status.completed_at = Date.now();
    if (!status.downloaded_at) status.downloaded_at = status.completed_at;
  } else {
    status.completed_at = undefined;
  }
  await putUserBatchStatus(ctx.effectiveEmail, params.id, status);
  return NextResponse.json({ ok: true, status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return flip(req, await params, true);
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return flip(req, await params, false);
}
