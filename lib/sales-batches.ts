// Sales batch storage — backed by Supabase PostgreSQL.
// Tables: sales_batches (with rows as JSONB), sales_batch_statuses
//
// All Blob / Edge Config / file-KV storage has been removed. The single
// source of truth is now Supabase.

import { getSupabase } from "@/lib/supabase";

export type BatchMeta = {
  id: string;
  name: string;
  folder?: string;
  source_batch_id?: string;
  lead_count: number;
  columns: string[];
  created_at: number;
  created_by: string;
};

export type Batch = BatchMeta & { rows: string[][] };

export type UserBatchStatus = {
  downloaded_at?: number;
  completed_at?: number;
};

export function randomId(len = 8): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Row mapper ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMeta(row: any): BatchMeta {
  return {
    id: row.id,
    name: row.name ?? "",
    folder: row.folder ?? "",
    source_batch_id: row.source_batch_id ?? undefined,
    lead_count: row.lead_count ?? 0,
    columns: row.columns ?? [],
    created_at: row.created_at ?? Date.now(),
    created_by: row.created_by ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBatch(row: any): Batch {
  return { ...rowToMeta(row), rows: row.rows ?? [] };
}

// ── Batches ──────────────────────────────────────────────────────────────────

export async function listBatchIndex(): Promise<BatchMeta[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sales_batches")
    .select("id, name, folder, source_batch_id, lead_count, columns, created_at, created_by")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listBatchIndex: ${error.message}`);
  return (data ?? []).map(rowToMeta);
}

export async function getBatch(id: string): Promise<Batch | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sales_batches")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`getBatch: ${error.message}`);
  }
  return data ? rowToBatch(data) : null;
}

export async function putBatch(b: Batch): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("sales_batches").upsert({
    id: b.id,
    name: b.name,
    folder: b.folder ?? "",
    source_batch_id: b.source_batch_id ?? null,
    lead_count: b.lead_count,
    columns: b.columns,
    created_at: b.created_at,
    created_by: b.created_by,
    rows: b.rows,
  });
  if (error) throw new Error(`putBatch: ${error.message}`);
}

export async function addBatch(meta: BatchMeta, rows: string[][]): Promise<void> {
  await putBatch({ ...meta, rows });
}

export async function addBatches(
  items: Array<{ meta: BatchMeta; rows: string[][] }>,
): Promise<void> {
  if (!items.length) return;
  const sb = getSupabase();
  const { error } = await sb.from("sales_batches").upsert(
    items.map(({ meta, rows }) => ({
      id: meta.id,
      name: meta.name,
      folder: meta.folder ?? "",
      source_batch_id: meta.source_batch_id ?? null,
      lead_count: meta.lead_count,
      columns: meta.columns,
      created_at: meta.created_at,
      created_by: meta.created_by,
      rows,
    })),
  );
  if (error) throw new Error(`addBatches: ${error.message}`);
}

export async function deleteBatch(id: string): Promise<void> {
  const sb = getSupabase();
  // Also clean up any user statuses for this batch
  await sb.from("sales_batch_statuses").delete().eq("batch_id", id);
  const { error } = await sb.from("sales_batches").delete().eq("id", id);
  if (error) throw new Error(`deleteBatch: ${error.message}`);
}

export async function updateBatchFolder(id: string, folder: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("sales_batches")
    .update({ folder: folder.trim().slice(0, 120) })
    .eq("id", id);
  if (error) throw new Error(`updateBatchFolder: ${error.message}`);
}

// Kept for the sales admin UI which lists distinct folder values
export async function listBatchFolders(): Promise<string[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sales_batches")
    .select("folder");
  if (error) throw new Error(`listBatchFolders: ${error.message}`);
  const folders = [...new Set((data ?? []).map((r) => (r.folder as string).trim()).filter(Boolean))];
  return folders.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
}

// addBatchFolder is a no-op for sales — folders are derived from batches,
// not created independently. Kept so existing callers don't break.
export async function addBatchFolder(_folderName: string): Promise<string[]> {
  return listBatchFolders();
}

// Kept for backward-compat; same as listBatchIndex now
export async function replaceBatchIndex(_items: BatchMeta[]): Promise<void> {
  // No-op — Supabase is authoritative; there's no separate index to maintain
}

// ── User batch statuses ──────────────────────────────────────────────────────

export async function getUserBatchStatus(
  email: string,
  batchId: string,
): Promise<UserBatchStatus> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sales_batch_statuses")
    .select("downloaded_at, completed_at")
    .eq("user_email", email.toLowerCase().trim())
    .eq("batch_id", batchId)
    .maybeSingle();
  if (error) throw new Error(`getUserBatchStatus: ${error.message}`);
  if (!data) return {};
  return {
    ...(data.downloaded_at != null ? { downloaded_at: data.downloaded_at } : {}),
    ...(data.completed_at != null ? { completed_at: data.completed_at } : {}),
  };
}

export async function putUserBatchStatus(
  email: string,
  batchId: string,
  s: UserBatchStatus,
): Promise<void> {
  const sb = getSupabase();
  const normalizedEmail = email.toLowerCase().trim();

  if (!s.downloaded_at && !s.completed_at) {
    // Clear status
    await sb
      .from("sales_batch_statuses")
      .delete()
      .eq("user_email", normalizedEmail)
      .eq("batch_id", batchId);
    return;
  }

  const { error } = await sb.from("sales_batch_statuses").upsert({
    user_email: normalizedEmail,
    batch_id: batchId,
    downloaded_at: s.downloaded_at ?? null,
    completed_at: s.completed_at ?? null,
  });
  if (error) throw new Error(`putUserBatchStatus: ${error.message}`);
}

// ── CSV utilities (pure — no storage dependency) ─────────────────────────────

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else field += c;
    }
  }
  if (field.length || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function csvField(v: string): string {
  if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

export function rowsToCsv(columns: string[], rows: string[][]): string {
  const head = columns.map(csvField).join(",");
  const body = rows.map((r) => r.map(csvField).join(",")).join("\n");
  return head + "\n" + body + "\n";
}
