import { get } from "@vercel/edge-config";
import { kvDelete, kvGet, kvPut } from "@/lib/store";

const INDEX_KEY = "leads_hub_batches_index";
const CHUNK_TARGET_BYTES = 180_000;

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

type LeadsHubBatchMeta = {
  chunkCount: number;
};

export function randomId(len = 8): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function batchMetaKey(id: string): string {
  return `leads_hub_batch_meta_${id}`;
}

function batchChunkKey(id: string, index: number): string {
  return `leads_hub_batch_${id}_${index}`;
}

function edgeConfigWritable(): boolean {
  return Boolean(
    process.env.EDGE_CONFIG_ID &&
      process.env.VERCEL_TEAM_ID &&
      process.env.VERCEL_API_TOKEN,
  );
}

async function edgeGetValue<T>(key: string): Promise<T | null> {
  if (!process.env.EDGE_CONFIG) return null;
  try {
    const raw = await get<unknown>(key);
    return raw === undefined ? null : (raw as T);
  } catch {
    return null;
  }
}

async function writeKey(key: string, value: unknown): Promise<void> {
  if (edgeConfigWritable()) {
    const id = process.env.EDGE_CONFIG_ID;
    const teamId = process.env.VERCEL_TEAM_ID;
    const token = process.env.VERCEL_API_TOKEN;
    const url = `https://api.vercel.com/v1/edge-config/${id}/items?teamId=${teamId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "upsert", key, value }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Edge Config write failed (${res.status}): ${body}`);
    }
    return;
  }
  await kvPut(key, value);
}

async function deleteKey(key: string): Promise<void> {
  if (edgeConfigWritable()) {
    const id = process.env.EDGE_CONFIG_ID;
    const teamId = process.env.VERCEL_TEAM_ID;
    const token = process.env.VERCEL_API_TOKEN;
    const url = `https://api.vercel.com/v1/edge-config/${id}/items?teamId=${teamId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "delete", key }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Edge Config delete failed (${res.status}): ${body}`);
    }
    return;
  }
  await kvDelete(key);
}

function chunkLeads(leads: LeadsHubLead[]): LeadsHubLead[][] {
  if (leads.length === 0) return [[]];

  const chunks: LeadsHubLead[][] = [];
  let current: LeadsHubLead[] = [];

  for (const lead of leads) {
    const next = [...current, lead];
    if (
      current.length > 0 &&
      JSON.stringify(next).length > CHUNK_TARGET_BYTES
    ) {
      chunks.push(current);
      current = [lead];
    } else {
      current = next;
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function readBatchMeta(id: string): Promise<LeadsHubBatchMeta | null> {
  const key = batchMetaKey(id);
  const edge = await edgeGetValue<LeadsHubBatchMeta>(key);
  if (edge && typeof edge.chunkCount === "number") return edge;

  const local = await kvGet<LeadsHubBatchMeta>(key);
  if (local && typeof local.chunkCount === "number") return local;
  return null;
}

async function deleteBatchChunks(id: string, chunkCount: number): Promise<void> {
  for (let i = 0; i < chunkCount; i++) {
    await deleteKey(batchChunkKey(id, i));
  }
}

export async function listLeadsHubBatches(): Promise<LeadsHubBatch[]> {
  const edge = await edgeGetValue<LeadsHubBatch[]>(INDEX_KEY);
  if (Array.isArray(edge)) return edge;
  return (await kvGet<LeadsHubBatch[]>(INDEX_KEY)) ?? [];
}

export async function writeLeadsHubBatchesIndex(batches: LeadsHubBatch[]): Promise<void> {
  await writeKey(INDEX_KEY, batches);
}

export async function getLeadsHubBatch(id: string): Promise<LeadsHubLead[]> {
  const meta = await readBatchMeta(id);
  if (meta?.chunkCount) {
    const all: LeadsHubLead[] = [];
    for (let i = 0; i < meta.chunkCount; i++) {
      const edge = await edgeGetValue<LeadsHubLead[]>(batchChunkKey(id, i));
      const chunk = Array.isArray(edge)
        ? edge
        : ((await kvGet<LeadsHubLead[]>(batchChunkKey(id, i))) ?? []);
      all.push(...chunk);
    }
    return all;
  }

  const legacyEdge = await edgeGetValue<LeadsHubLead[]>(batchChunkKey(id, 0));
  if (Array.isArray(legacyEdge)) return legacyEdge;

  return (await kvGet<LeadsHubLead[]>(batchChunkKey(id, 0))) ?? [];
}

export async function putLeadsHubBatch(id: string, leads: LeadsHubLead[]): Promise<void> {
  const previousMeta = await readBatchMeta(id);
  const chunks = chunkLeads(leads);

  for (let i = 0; i < chunks.length; i++) {
    await writeKey(batchChunkKey(id, i), chunks[i]);
  }

  await writeKey(batchMetaKey(id), { chunkCount: chunks.length });

  const previousChunkCount = previousMeta?.chunkCount ?? 0;
  for (let i = chunks.length; i < previousChunkCount; i++) {
    await deleteKey(batchChunkKey(id, i));
  }
}

export async function addLeadsHubBatch(
  meta: LeadsHubBatch,
  leads: LeadsHubLead[],
): Promise<void> {
  await putLeadsHubBatch(meta.id, leads);
  const index = await listLeadsHubBatches();
  index.unshift(meta);
  await writeLeadsHubBatchesIndex(index);
}

export async function deleteLeadsHubBatch(id: string): Promise<void> {
  const meta = await readBatchMeta(id);
  if (meta?.chunkCount) {
    await deleteBatchChunks(id, meta.chunkCount);
    await deleteKey(batchMetaKey(id));
  } else {
    await deleteKey(batchChunkKey(id, 0));
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
