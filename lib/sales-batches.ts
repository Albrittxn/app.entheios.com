// Sales batches storage + CSV utilities.
// Keys:
//   batches:index            → BatchMeta[] (most recent first)
//   batch:<id>               → Batch (meta + rows)
//   batchstatus:<email>:<id> → UserBatchStatus

import { del, get, list, put } from "@vercel/blob";
import { kvGet, kvPut, kvDelete } from "@/lib/store";

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

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function batchRowsPath(id: string): string {
  return `sales/batches/${id}/rows.json`;
}

function batchMetaPath(id: string): string {
  return `sales/batches/${id}/meta.json`;
}

function batchStatusPath(email: string, batchId: string): string {
  return `sales/status/${encodeURIComponent(email.toLowerCase().trim())}/${batchId}.json`;
}

function batchFoldersPath(): string {
  return "sales/folders/list.json";
}

function blobConfigError(): Error {
  return new Error(
    "Sales batch storage requires Vercel Blob in production. Add a Blob store to this Vercel project so BLOB_READ_WRITE_TOKEN is available.",
  );
}

function normalizeBatchMeta(meta: Partial<BatchMeta> & { id: string }): BatchMeta {
  return {
    id: meta.id,
    name: meta.name ?? "",
    folder: meta.folder ?? "",
    source_batch_id: meta.source_batch_id ?? "",
    lead_count: meta.lead_count ?? 0,
    columns: meta.columns ?? [],
    created_at: meta.created_at ?? Date.now(),
    created_by: meta.created_by ?? "",
  };
}

function normalizeFolderName(name: string): string {
  return name.trim().slice(0, 120);
}

function normalizeFolderList(names: string[]): string[] {
  return [...new Set(names.map(normalizeFolderName).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
  );
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

async function writeBlobJson(pathname: string, value: unknown): Promise<void> {
  await put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function deleteBlob(pathname: string): Promise<void> {
  try {
    await del(pathname);
  } catch {
    // Ignore deletes for already-missing blobs.
  }
}

export function randomId(len = 8): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function listBatchIndex(): Promise<BatchMeta[]> {
  if (blobConfigured()) {
    const blobs: { pathname: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({
        prefix: "sales/batches/",
        mode: "expanded",
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const metas = await Promise.all(
      blobs
        .filter((blob) => blob.pathname.endsWith("/meta.json"))
        .map(async (blob) => {
          const meta = await readBlobJson<Partial<BatchMeta> & { id: string }>(blob.pathname);
          return meta ? normalizeBatchMeta(meta) : null;
        }),
    );

    return metas
      .filter((meta): meta is BatchMeta => Boolean(meta))
      .sort((a, b) => b.created_at - a.created_at);
  }
  return (await kvGet<BatchMeta[]>("batches:index")) ?? [];
}

async function writeBatchIndex(items: BatchMeta[]): Promise<void> {
  await kvPut("batches:index", items);
}

export async function replaceBatchIndex(items: BatchMeta[]): Promise<void> {
  await writeBatchIndex(items);
}

export async function getBatch(id: string): Promise<Batch | null> {
  if (blobConfigured()) {
    const [meta, rows] = await Promise.all([
      readBlobJson<Partial<BatchMeta> & { id: string }>(batchMetaPath(id)),
      readBlobJson<string[][]>(batchRowsPath(id)),
    ]);
    if (!meta || !rows) return null;
    return { ...normalizeBatchMeta(meta), rows };
  }
  return kvGet<Batch>(`batch:${id}`);
}

export async function putBatch(b: Batch): Promise<void> {
  if (!blobConfigured() && process.env.VERCEL) throw blobConfigError();
  if (blobConfigured()) {
    await Promise.all([
      writeBlobJson(batchMetaPath(b.id), normalizeBatchMeta(b)),
      writeBlobJson(batchRowsPath(b.id), b.rows),
    ]);
    return;
  }
  await kvPut(`batch:${b.id}`, b);
}

export async function deleteBatch(id: string): Promise<void> {
  if (blobConfigured()) {
    await Promise.all([deleteBlob(batchMetaPath(id)), deleteBlob(batchRowsPath(id))]);
    return;
  }
  await kvDelete(`batch:${id}`);
  const idx = await listBatchIndex();
  await writeBatchIndex(idx.filter((m) => m.id !== id));
}

export async function addBatch(meta: BatchMeta, rows: string[][]): Promise<void> {
  await putBatch({ ...meta, rows });
  if (blobConfigured()) return;
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
  if (blobConfigured()) return;
  const idx = await listBatchIndex();
  const next = [...items.map((item) => item.meta), ...idx];
  await writeBatchIndex(next);
}

export async function updateBatchFolder(id: string, folder: string): Promise<void> {
  const nextFolder = folder.trim().slice(0, 120);
  if (blobConfigured()) {
    const meta = await readBlobJson<Partial<BatchMeta> & { id: string }>(batchMetaPath(id));
    if (!meta) throw new Error(`Sales batch not found: ${id}`);
    await writeBlobJson(batchMetaPath(id), {
      ...normalizeBatchMeta(meta),
      folder: nextFolder,
    });
    return;
  }

  const batch = await kvGet<Batch>(`batch:${id}`);
  if (batch) {
    await kvPut(`batch:${id}`, { ...batch, folder: nextFolder });
  }
  const index = await listBatchIndex();
  await writeBatchIndex(index.map((item) => (item.id === id ? { ...item, folder: nextFolder } : item)));
}

export async function listBatchFolders(): Promise<string[]> {
  const batchFolders = (await listBatchIndex()).map((item) => item.folder ?? "");
  if (blobConfigured()) {
    const stored = (await readBlobJson<string[]>(batchFoldersPath())) ?? [];
    return normalizeFolderList([...stored, ...batchFolders]);
  }
  const stored = (await kvGet<string[]>("sales:folders")) ?? [];
  return normalizeFolderList([...stored, ...batchFolders]);
}

export async function addBatchFolder(folderName: string): Promise<string[]> {
  const folder = normalizeFolderName(folderName);
  if (!folder) throw new Error("Folder name required.");

  const next = normalizeFolderList([...(await listBatchFolders()), folder]);
  if (blobConfigured()) {
    await writeBlobJson(batchFoldersPath(), next);
    return next;
  }

  await kvPut("sales:folders", next);
  return next;
}

export async function getUserBatchStatus(
  email: string,
  batchId: string,
): Promise<UserBatchStatus> {
  if (blobConfigured()) {
    return (await readBlobJson<UserBatchStatus>(batchStatusPath(email, batchId))) ?? {};
  }
  return (await kvGet<UserBatchStatus>(`batchstatus:${email}:${batchId}`)) ?? {};
}

export async function putUserBatchStatus(
  email: string,
  batchId: string,
  s: UserBatchStatus,
): Promise<void> {
  if (!blobConfigured() && process.env.VERCEL) throw blobConfigError();
  if (blobConfigured()) {
    await writeBlobJson(batchStatusPath(email, batchId), s);
    return;
  }
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
