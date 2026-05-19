// GET /api/sales/batches/<id>/csv → stream CSV, auto-mark downloaded
import { getEffectiveUser } from "@/lib/effective-user";
import {
  getBatch,
  getUserBatchStatus,
  putUserBatchStatus,
  rowsToCsv,
} from "@/lib/sales-batches";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getEffectiveUser();
  if (!ctx)
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const { id } = await params;
  const batch = await getBatch(id);
  if (!batch)
    return new Response(JSON.stringify({ error: "Batch not found" }), { status: 404 });

  // Only mark downloaded when user is acting as themselves
  if (!ctx.impersonating) {
    const status = await getUserBatchStatus(ctx.effectiveEmail, id);
    if (!status.downloaded_at) {
      status.downloaded_at = Date.now();
      await putUserBatchStatus(ctx.effectiveEmail, id, status);
    }
  }

  const csv = rowsToCsv(batch.columns, batch.rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${batch.name.replace(/[^a-z0-9._-]+/gi, "_")}.csv"`,
      "cache-control": "no-store",
    },
  });
}
