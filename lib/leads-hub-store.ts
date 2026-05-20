import { get } from "@vercel/edge-config";
import { kvDelete, kvGet, kvPut } from "@/lib/store";

const INDEX_KEY = "leads_hub:batches:index";

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

function batchKey(id: string): string {
  return `leads_hub:batch:${id}`;
}

function edgeConfigWritable(): boolean {
  return Boolean(
    process.env.EDGE_CONFIG_ID &&
      process.env.VERCEL_TEAM_ID &&
      process.env.VERCEL_API_TOKEN,
  );
}

async function edgeGetArray<T>(key: string): Promise<T[] | null> {
  if (!process.env.EDGE_CONFIG) return null;
  try {
    const raw = await get<unknown>(key);
    return Array.isArray(raw) ? (raw as T[]) : [];
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

export async function listLeadsHubBatches(): Promise<LeadsHubBatch[]> {
  const edge = await edgeGetArray<LeadsHubBatch>(INDEX_KEY);
  if (edge) return edge;
  return (await kvGet<LeadsHubBatch[]>(INDEX_KEY)) ?? [];
}

export async function writeLeadsHubBatchesIndex(batches: LeadsHubBatch[]): Promise<void> {
  await writeKey(INDEX_KEY, batches);
}

export async function getLeadsHubBatch(id: string): Promise<LeadsHubLead[]> {
  const key = batchKey(id);
  const edge = await edgeGetArray<LeadsHubLead>(key);
  if (edge) return edge;
  return (await kvGet<LeadsHubLead[]>(key)) ?? [];
}

export async function putLeadsHubBatch(id: string, leads: LeadsHubLead[]): Promise<void> {
  await writeKey(batchKey(id), leads);
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
  await deleteKey(batchKey(id));
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
