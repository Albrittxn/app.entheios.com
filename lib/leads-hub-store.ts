import { del, get, put } from "@vercel/blob";
import { kvDelete, kvGet, kvPut } from "@/lib/store";

const INDEX_KEY = "leads_hub_batches_index";
const INDEX_PATH = "leads-hub/index.json";

export type LeadsHubBatch = {
  id: string;
  name: string;
  fileName: string;
  leadCount: number;
  columns: string[];
  uploadedAt: string;
  uploadedBy: string;
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

export async function listLeadsHubBatches(): Promise<LeadsHubBatch[]> {
  if (blobConfigured()) {
    return (await readBlobJson<LeadsHubBatch[]>(INDEX_PATH)) ?? [];
  }
  return (await kvGet<LeadsHubBatch[]>(INDEX_KEY)) ?? [];
}

export async function writeLeadsHubBatchesIndex(batches: LeadsHubBatch[]): Promise<void> {
  if (blobConfigured()) {
    await writeBlobJson(INDEX_PATH, batches);
    return;
  }
  await kvPut(INDEX_KEY, batches);
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
  await putLeadsHubBatch(meta.id, leads);
  const index = await listLeadsHubBatches();
  index.unshift(meta);
  await writeLeadsHubBatchesIndex(index);
}

export async function deleteLeadsHubBatch(id: string): Promise<void> {
  if (blobConfigured()) {
    await deleteBlob(batchPath(id));
  } else {
    await kvDelete(batchPath(id));
  }

  const index = await listLeadsHubBatches();
  await writeLeadsHubBatchesIndex(index.filter((b) => b.id !== id));
}

export async function deleteLeadsHubLead(batchId: string, leadId: string): Promise<void> {
  const leads = await getLeadsHubBatch(batchId);
  const nextLeads = leads.filter((l) => l.id !== leadId);
  await putLeadsHubBatch(batchId, nextLeads);

  const index = await listLeadsHubBatches();
  const nextIndex = index.map((b) =>
    b.id === batchId ? { ...b, leadCount: nextLeads.length } : b,
  );
  await writeLeadsHubBatchesIndex(nextIndex);
}

export async function restoreLeadsHubLead(lead: LeadsHubLead): Promise<void> {
  const leads = await getLeadsHubBatch(lead.batchId);
  leads.push(lead);
  await putLeadsHubBatch(lead.batchId, leads);

  const index = await listLeadsHubBatches();
  const nextIndex = index.map((b) =>
    b.id === lead.batchId ? { ...b, leadCount: leads.length } : b,
  );
  await writeLeadsHubBatchesIndex(nextIndex);
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
