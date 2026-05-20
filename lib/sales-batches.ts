// Sales batches storage + CSV utilities.
// Keys:
//   batches:index            → BatchMeta[] (most recent first)
//   batch:<id>               → Batch (meta + rows)
//   batchstatus:<email>:<id> → UserBatchStatus

import { kvGet, kvPut, kvDelete } from "@/lib/store";

export type BatchMeta = {
  id: string;
  name: string;
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

export async function listBatchIndex(): Promise<BatchMeta[]> {
  return (await kvGet<BatchMeta[]>("batches:index")) ?? [];
}

async function writeBatchIndex(items: BatchMeta[]): Promise<void> {
  await kvPut("batches:index", items);
}

export async function replaceBatchIndex(items: BatchMeta[]): Promise<void> {
  await writeBatchIndex(items);
}

export async function getBatch(id: string): Promise<Batch | null> {
  return kvGet<Batch>(`batch:${id}`);
}

export async function putBatch(b: Batch): Promise<void> {
  await kvPut(`batch:${b.id}`, b);
}

export async function deleteBatch(id: string): Promise<void> {
  await kvDelete(`batch:${id}`);
  const idx = await listBatchIndex();
  await writeBatchIndex(idx.filter((m) => m.id !== id));
}

export async function addBatch(meta: BatchMeta, rows: string[][]): Promise<void> {
  await putBatch({ ...meta, rows });
  const idx = await listBatchIndex();
  idx.unshift(meta);
  await writeBatchIndex(idx);
}

export async function addBatches(items: Array<{ meta: BatchMeta; rows: string[][] }>): Promise<void> {
  if (!items.length) return;
  for (const { meta, rows } of items) {
    // Keep bulk imports steady and avoid overwhelming the storage backend.
    // eslint-disable-next-line no-await-in-loop
    await putBatch({ ...meta, rows });
  }
  const idx = await listBatchIndex();
  const next = [...items.map((item) => item.meta), ...idx];
  await writeBatchIndex(next);
}

export async function getUserBatchStatus(
  email: string,
  batchId: string,
): Promise<UserBatchStatus> {
  return (await kvGet<UserBatchStatus>(`batchstatus:${email}:${batchId}`)) ?? {};
}

export async function putUserBatchStatus(
  email: string,
  batchId: string,
  s: UserBatchStatus,
): Promise<void> {
  await kvPut(`batchstatus:${email}:${batchId}`, s);
}

// ── CSV ─────────────────────────────────────────────────────────────────

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
