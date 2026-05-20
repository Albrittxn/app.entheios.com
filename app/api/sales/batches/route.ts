// GET /api/sales/batches              → list batches w/ user's status
// POST /api/sales/batches  (admin)    → create batch from CSV
// DELETE /api/sales/batches?id=X or ids[]=X,Y (admin) → remove batch(es)
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectiveUser } from "@/lib/effective-user";
import { isAdminEmail } from "@/lib/permissions";
import {
  type BatchMeta,
  addBatch,
  deleteBatch,
  getUserBatchStatus,
  listBatchIndex,
  parseCsv,
  randomId,
  updateBatchFolder,
} from "@/lib/sales-batches";

export async function GET() {
  const ctx = await getEffectiveUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const index = await listBatchIndex();
  const batches = await Promise.all(
    index.map(async (m) => ({ ...m, status: await getUserBatchStatus(ctx.effectiveEmail, m.id) })),
  );
  return NextResponse.json({ batches });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as { name?: unknown; csv?: unknown };
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
  const csv = typeof b.csv === "string" ? b.csv : "";
  const folder =
    typeof (b as { folder?: unknown }).folder === "string"
      ? (b as { folder: string }).folder.trim().slice(0, 120)
      : "";
  const sourceBatchId =
    typeof (b as { sourceBatchId?: unknown }).sourceBatchId === "string"
      ? (b as { sourceBatchId: string }).sourceBatchId.trim()
      : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!csv) return NextResponse.json({ error: "CSV required" }, { status: 400 });
  if (csv.length > 5_000_000)
    return NextResponse.json({ error: "CSV too large (5MB max)" }, { status: 400 });

  const parsed = parseCsv(csv);
  if (parsed.length < 2)
    return NextResponse.json({ error: "CSV needs header + at least one row" }, { status: 400 });
  const columns = parsed[0].map((c) => c.trim());
  const rows = parsed.slice(1);
  if (rows.length > 20000)
    return NextResponse.json({ error: "Too many rows (20k max)" }, { status: 400 });

  const meta: BatchMeta = {
    id: randomId(),
    name,
    ...(folder ? { folder } : {}),
    ...(sourceBatchId ? { source_batch_id: sourceBatchId } : {}),
    lead_count: rows.length,
    columns,
    created_at: Date.now(),
    created_by: session.email.toLowerCase(),
  };
  try {
    await addBatch(meta, rows);
    return NextResponse.json({ ok: true, batch: meta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create batch.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { id?: unknown; folder?: unknown };
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const folder = typeof payload.folder === "string" ? payload.folder.trim().slice(0, 120) : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await updateBatchFolder(id, folder);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update folder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const singleId = url.searchParams.get("id")?.trim() ?? "";
  const queryIds = url.searchParams
    .getAll("ids")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const ids = [...new Set([singleId, ...queryIds].filter(Boolean))];
  if (!ids.length) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await Promise.all(ids.map((id) => deleteBatch(id)));
    return NextResponse.json({ ok: true, removed: ids.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete batch.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
