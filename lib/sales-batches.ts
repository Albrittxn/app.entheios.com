// Sales batches storage + CSV utilities.
// Keys:
//   batches:index            → BatchMeta[] (most recent first)
//   batch:<id>               → Batch (meta + rows)
//   batchstatus:<email>:<id> → UserBatchStatus

import { get as edgeGet } from "@vercel/edge-config";
import { del, get as blobGet, list as blobList, put as blobPut } from "@vercel/blob";
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

type UserBatchStatusMap = Record<string, UserBatchStatus>;

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function batchRowsPath(id: string): string {
  return `sales/batches/${id}/rows.json`;
}

function batchMetaPath(id: string): string {
  return `sales/batches/${id}/meta.json`;
}

function normalizeStatusEmail(email: string): string {
  return email.toLowerCase().trim();
}

function batchStatusUserKey(email: string): string {
  return Buffer.from(normalizeStatusEmail(email)).toString("base64url");
}

function batchStatusPath(email: string, batchId: string): string {
  return `sales/status/${batchStatusUserKey(email)}/${batchId}.json`;
}

function legacyBatchStatusPath(email: string, batchId: string): string {
  return `sales/status/${encodeURIComponent(normalizeStatusEmail(email))}/${batchId}.json`;
}

function batchFoldersPath(): string {
  return "sales/folders/list.json";
}

function batchStatusStoreKey(email: string): string {
  return `sales_batch_statuses:${batchStatusUserKey(email)}`;
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
  const result = await blobGet(pathname, { access: "private" });
  if (result && result.statusCode === 200 && result.stream) {
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  }

  // Blob pathnames that already contain percent-encoded segments can fail to
  // resolve through `get(pathname)` because the client re-encodes `%`.
  // Fall back to resolving the exact blob first, then read via its blob URL.
  if (pathname.includes("%")) {
    const page = await blobList({ prefix: pathname, mode: "expanded", limit: 10 });
    const exact = page.blobs.find((blob) => blob.pathname === pathname);
    if (exact) {
      const byUrl = await blobGet(exact.url, { access: "private" });
      if (byUrl && byUrl.statusCode === 200 && byUrl.stream) {
        const text = await new Response(byUrl.stream).text();
        return JSON.parse(text) as T;
      }
    }
  }

  return null;
}

async function writeBlobJson(pathname: string, value: unknown): Promise<void> {
  await blobPut(pathname, JSON.stringify(value), {
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
      const page = await blobList({
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

function edgeStatusWritable(): boolean {
  return Boolean(
    process.env.EDGE_CONFIG_ID &&
      process.env.VERCEL_TEAM_ID &&
      process.env.VERCEL_API_TOKEN,
  );
}

async function readEdgeUserBatchStatusMap(email: string): Promise<UserBatchStatusMap | null> {
  if (!process.env.EDGE_CONFIG) return null;
  try {
    const raw = await edgeGet<unknown>(batchStatusStoreKey(email));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: UserBatchStatusMap = {};
    for (const [batchId, value] of Object.entries(raw)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const downloaded_at =
        typeof (value as { downloaded_at?: unknown }).downloaded_at === "number"
          ? (value as { downloaded_at: number }).downloaded_at
          : undefined;
      const completed_at =
        typeof (value as { completed_at?: unknown }).completed_at === "number"
          ? (value as { completed_at: number }).completed_at
          : undefined;
      out[batchId] = {
        ...(downloaded_at ? { downloaded_at } : {}),
        ...(completed_at ? { completed_at } : {}),
      };
    }
    return out;
  } catch {
    return {};
  }
}

async function writeEdgeUserBatchStatusMap(
  email: string,
  statuses: UserBatchStatusMap,
): Promise<void> {
  const id = process.env.EDGE_CONFIG_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const token = process.env.VERCEL_API_TOKEN;
  if (!id || !teamId || !token) {
    throw new Error(
      "Edge Config write env vars missing (EDGE_CONFIG_ID, VERCEL_TEAM_ID, VERCEL_API_TOKEN).",
    );
  }
  const url = `https://api.vercel.com/v1/edge-config/${id}/items?teamId=${teamId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: batchStatusStoreKey(email), value: statuses }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Edge Config write failed (${res.status}): ${body}`);
  }
}

export async function getUserBatchStatus(
  email: string,
  batchId: string,
): Promise<UserBatchStatus> {
  const normalizedEmail = normalizeStatusEmail(email);
  const edgeStatuses = await readEdgeUserBatchStatusMap(normalizedEmail);
  if (edgeStatuses && edgeStatuses[batchId]) {
    return edgeStatuses[batchId];
  }

  if (blobConfigured()) {
    const currentPath = batchStatusPath(normalizedEmail, batchId);
    const current = await readBlobJson<UserBatchStatus>(currentPath);
    if (current) {
      if (edgeStatusWritable()) {
        const next = { ...(edgeStatuses ?? {}), [batchId]: current };
        await writeEdgeUserBatchStatusMap(normalizedEmail, next);
      }
      return current;
    }

    const legacyPath = legacyBatchStatusPath(normalizedEmail, batchId);
    if (legacyPath !== currentPath) {
      const legacy = (await readBlobJson<UserBatchStatus>(legacyPath)) ?? {};
      if ((legacy.downloaded_at || legacy.completed_at) && edgeStatusWritable()) {
        const next = { ...(edgeStatuses ?? {}), [batchId]: legacy };
        await writeEdgeUserBatchStatusMap(normalizedEmail, next);
      }
      return legacy;
    }
    return {};
  }
  return (await kvGet<UserBatchStatus>(`batchstatus:${normalizedEmail}:${batchId}`)) ?? {};
}

export async function putUserBatchStatus(
  email: string,
  batchId: string,
  s: UserBatchStatus,
): Promise<void> {
  const normalizedEmail = normalizeStatusEmail(email);
  if (edgeStatusWritable()) {
    const statuses = (await readEdgeUserBatchStatusMap(normalizedEmail)) ?? {};
    const next = { ...statuses };
    if (s.downloaded_at || s.completed_at) next[batchId] = s;
    else delete next[batchId];
    await writeEdgeUserBatchStatusMap(normalizedEmail, next);
  }

  if (!blobConfigured() && process.env.VERCEL) throw blobConfigError();
  if (blobConfigured()) {
    if (s.downloaded_at || s.completed_at) {
      await writeBlobJson(batchStatusPath(normalizedEmail, batchId), s);
    } else {
      await deleteBlob(batchStatusPath(normalizedEmail, batchId));
    }

    await deleteBlob(legacyBatchStatusPath(normalizedEmail, batchId));
    return;
  }
  if (s.downloaded_at || s.completed_at) {
    await kvPut(`batchstatus:${normalizedEmail}:${batchId}`, s);
  } else {
    await kvDelete(`batchstatus:${normalizedEmail}:${batchId}`);
  }
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
