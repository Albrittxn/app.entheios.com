// POST   → mark downloaded for current user
// DELETE → move back to new for current user
import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { getUserBatchStatus, putUserBatchStatus } from "@/lib/sales-batches";

async function flip(req: Request, params: { id: string }, downloaded: boolean) {
  const ctx = await getEffectiveUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.impersonating)
    return NextResponse.json({ error: "Read-only while previewing as another user" }, { status: 403 });
  const status = await getUserBatchStatus(ctx.effectiveEmail, params.id);
  if (downloaded) {
    status.downloaded_at = status.downloaded_at ?? Date.now();
  } else {
    status.downloaded_at = undefined;
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
