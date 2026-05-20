import { del, get, list, put } from "@vercel/blob";
import { kvDelete, kvGet, kvPut } from "@/lib/store";

export type LeadsHubBatch = {
  id: string;
  name: string;
  fileName: string;
  leadCount: number;
  columns: string[];
  uploadedAt: string;
  uploadedBy: string;
  folder: string;
};

export type LeadsHubLead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  brokerage: string;
  state: string;
  addedAt: string;
  batchId: string;
  batchName: string;
};

export function randomId(len = 8): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function batchPath(id: string): string {
  return `leads-hub/batches/${id}/leads.json`;
}

function batchMetaPath(id: string): string {
  return `leads-hub/batches/${id}/meta.json`;
}

function foldersPath(): string {
  return "leads-hub/folders/index.json";
}

function normalizeBatchMeta(meta: Partial<LeadsHubBatch> & { id: string }): LeadsHubBatch {
  return {
    id: meta.id,
    name: meta.name ?? "",
    fileName: meta.fileName ?? "",
    leadCount: meta.leadCount ?? 0,
    columns: meta.columns ?? [],
    uploadedAt: meta.uploadedAt ?? new Date().toISOString(),
    uploadedBy: meta.uploadedBy ?? "",
    folder: meta.folder ?? "",
  };
}

function blobConfigError(): Error {
  return new Error(
    "Leads Hub storage requires Vercel Blob. Add a Blob store to this Vercel project so BLOB_READ_WRITE_TOKEN is available.",
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
    // ignore deletes for already-missing blobs
  }
}

function normalizeFolderName(folder: string): string {
  return folder.trim().slice(0, 120);
}

function sortFolders(folders: string[]): string[] {
  return [...new Set(folders.map(normalizeFolderName).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
  );
}

export async function listLeadsHubFolders(): Promise<string[]> {
  const batchFolders = (await listLeadsHubBatches()).map((batch) => batch.folder);
  if (blobConfigured()) {
    const stored = (await readBlobJson<string[]>(foldersPath())) ?? [];
    return sortFolders([...stored, ...batchFolders]);
  }
  const stored = (await kvGet<string[]>("leads_hub_folders")) ?? [];
  return sortFolders([...stored, ...batchFolders]);
}

export async function createLeadsHubFolder(folder: string): Promise<string> {
  const nextFolder = normalizeFolderName(folder);
  if (!nextFolder) throw new Error("Folder name required");
  if (!blobConfigured() && process.env.VERCEL) throw blobConfigError();
  const current = await listLeadsHubFolders();
  const next = sortFolders([...current, nextFolder]);
  if (blobConfigured()) {
    await writeBlobJson(foldersPath(), next);
    return nextFolder;
  }
  await kvPut("leads_hub_folders", next);
  return nextFolder;
}

export async function deleteLeadsHubFolder(folder: string): Promise<void> {
  const targetFolder = normalizeFolderName(folder);
  if (!targetFolder) throw new Error("Folder name required");

  const batches = await listLeadsHubBatches();
  const affected = batches.filter((batch) => batch.folder.trim() === targetFolder);

  if (blobConfigured()) {
    const stored = (await readBlobJson<string[]>(foldersPath())) ?? [];
    const nextFolders = stored.filter((item) => normalizeFolderName(item) !== targetFolder);
    await writeBlobJson(foldersPath(), sortFolders(nextFolders));

    for (const batch of affected) {
      const meta = await readBlobJson<Partial<LeadsHubBatch> & { id: string }>(batchMetaPath(batch.id));
      if (!meta) continue;
      await writeBlobJson(batchMetaPath(batch.id), {
        ...normalizeBatchMeta(meta),
        folder: "",
      });
    }
    return;
  }

  const stored = (await kvGet<string[]>("leads_hub_folders")) ?? [];
  const nextFolders = stored.filter((item) => normalizeFolderName(item) !== targetFolder);
  await kvPut("leads_hub_folders", sortFolders(nextFolders));

  const nextIndex = batches.map((batch) =>
    batch.folder.trim() === targetFolder ? { ...batch, folder: "" } : batch,
  );
  await kvPut("leads_hub_batches_index", nextIndex);
}

export async function listLeadsHubBatches(): Promise<LeadsHubBatch[]> {
  if (blobConfigured()) {
    const blobs: { pathname: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({
        prefix: "leads-hub/batches/",
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
          const meta = await readBlobJson<Partial<LeadsHubBatch> & { id: string }>(blob.pathname);
          return meta ? normalizeBatchMeta(meta) : null;
        }),
    );

    return metas
      .filter((meta): meta is LeadsHubBatch => Boolean(meta))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }
  return (await kvGet<LeadsHubBatch[]>("leads_hub_batches_index")) ?? [];
}

export async function updateLeadsHubBatchFolder(id: string, folder: string): Promise<void> {
  const nextFolder = normalizeFolderName(folder);
  if (nextFolder) await createLeadsHubFolder(nextFolder);
  if (blobConfigured()) {
    const meta = await readBlobJson<Partial<LeadsHubBatch> & { id: string }>(batchMetaPath(id));
    if (!meta) throw new Error(`Leads Hub batch not found: ${id}`);
    await writeBlobJson(batchMetaPath(id), {
      ...normalizeBatchMeta(meta),
      folder: nextFolder,
    });
    return;
  }

  const index = await listLeadsHubBatches();
  const nextIndex = index.map((b) => (b.id === id ? { ...b, folder: nextFolder } : b));
  await kvPut("leads_hub_batches_index", nextIndex);
}

export async function getLeadsHubBatch(id: string): Promise<LeadsHubLead[]> {
  if (blobConfigured()) {
    return (await readBlobJson<LeadsHubLead[]>(batchPath(id))) ?? [];
  }
  return (await kvGet<LeadsHubLead[]>(batchPath(id))) ?? [];
}

export async function putLeadsHubBatch(id: string, leads: LeadsHubLead[]): Promise<void> {
  if (blobConfigured()) {
    await writeBlobJson(batchPath(id), leads);
    return;
  }
  await kvPut(batchPath(id), leads);
}

export async function addLeadsHubBatch(
  meta: LeadsHubBatch,
  leads: LeadsHubLead[],
): Promise<void> {
  if (!blobConfigured() && process.env.VERCEL) {
    throw blobConfigError();
  }
  if (meta.folder) await createLeadsHubFolder(meta.folder);
  await putLeadsHubBatch(meta.id, leads);
  if (blobConfigured()) {
    await writeBlobJson(batchMetaPath(meta.id), normalizeBatchMeta(meta));
    return;
  }
  const index = await listLeadsHubBatches();
  index.unshift(meta);
  await kvPut("leads_hub_batches_index", index);
}

export async function deleteLeadsHubBatch(id: string): Promise<void> {
  if (blobConfigured()) {
    await deleteBlob(batchPath(id));
    await deleteBlob(batchMetaPath(id));
    return;
  }

  await kvDelete(batchPath(id));
  const index = await listLeadsHubBatches();
  await kvPut("leads_hub_batches_index", index.filter((b) => b.id !== id));
}

export async function deleteLeadsHubLead(batchId: string, leadId: string): Promise<void> {
  const leads = await getLeadsHubBatch(batchId);
  const nextLeads = leads.filter((l) => l.id !== leadId);
  await putLeadsHubBatch(batchId, nextLeads);

  if (blobConfigured()) {
    const meta = await readBlobJson<LeadsHubBatch>(batchMetaPath(batchId));
    if (meta) {
      await writeBlobJson(batchMetaPath(batchId), {
        ...normalizeBatchMeta(meta),
        leadCount: nextLeads.length,
      });
    }
    return;
  }

  const index = await listLeadsHubBatches();
  const nextIndex = index.map((b) => (b.id === batchId ? { ...b, leadCount: nextLeads.length } : b));
  await kvPut("leads_hub_batches_index", nextIndex);
}

export async function restoreLeadsHubLead(lead: LeadsHubLead): Promise<void> {
  const leads = await getLeadsHubBatch(lead.batchId);
  leads.push(lead);
  await putLeadsHubBatch(lead.batchId, leads);

  if (blobConfigured()) {
    const meta = await readBlobJson<LeadsHubBatch>(batchMetaPath(lead.batchId));
    if (meta) {
      await writeBlobJson(batchMetaPath(lead.batchId), {
        ...normalizeBatchMeta(meta),
        leadCount: leads.length,
      });
    }
    return;
  }

  const index = await listLeadsHubBatches();
  const nextIndex = index.map((b) => (b.id === lead.batchId ? { ...b, leadCount: leads.length } : b));
  await kvPut("leads_hub_batches_index", nextIndex);
}

export async function getLeadsHubAllLeads(): Promise<LeadsHubLead[]> {
  const index = await listLeadsHubBatches();
  const allLeads: LeadsHubLead[] = [];
  for (const batch of index) {
    const leads = await getLeadsHubBatch(batch.id);
    allLeads.push(...leads);
  }
  allLeads.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  return allLeads;
}
