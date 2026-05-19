import { kvGet, kvPut, kvDelete } from "@/lib/store";

export type LeadsHubBatch = {
  id: string;
  name: string;      // Custom batch title/name verified by user
  fileName: string;  // Original uploaded file name
  leadCount: number;
  columns: string[];
  uploadedAt: string; // ISO string
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
  addedAt: string;    // ISO string
  batchId: string;
  batchName: string;
};

export function randomId(len = 8): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function listLeadsHubBatches(): Promise<LeadsHubBatch[]> {
  return (await kvGet<LeadsHubBatch[]>("leads_hub:batches:index")) ?? [];
}

export async function writeLeadsHubBatchesIndex(batches: LeadsHubBatch[]): Promise<void> {
  await kvPut("leads_hub:batches:index", batches);
}

export async function getLeadsHubBatch(id: string): Promise<LeadsHubLead[]> {
  return (await kvGet<LeadsHubLead[]>(`leads_hub:batch:${id}`)) ?? [];
}

export async function putLeadsHubBatch(id: string, leads: LeadsHubLead[]): Promise<void> {
  await kvPut(`leads_hub:batch:${id}`, leads);
}

export async function addLeadsHubBatch(
  meta: LeadsHubBatch,
  leads: LeadsHubLead[],
): Promise<void> {
  await putLeadsHubBatch(meta.id, leads);
  const index = await listLeadsHubBatches();
  // Unshift so most recent is first
  index.unshift(meta);
  await writeLeadsHubBatchesIndex(index);
}

export async function deleteLeadsHubBatch(id: string): Promise<void> {
  await kvDelete(`leads_hub:batch:${id}`);
  const index = await listLeadsHubBatches();
  await writeLeadsHubBatchesIndex(index.filter((b) => b.id !== id));
}

export async function deleteLeadsHubLead(batchId: string, leadId: string): Promise<void> {
  const leads = await getLeadsHubBatch(batchId);
  const nextLeads = leads.filter((l) => l.id !== leadId);
  await putLeadsHubBatch(batchId, nextLeads);

  // Update lead count in the batch index
  const index = await listLeadsHubBatches();
  const nextIndex = index.map((b) => {
    if (b.id === batchId) {
      return { ...b, leadCount: nextLeads.length };
    }
    return b;
  });
  await writeLeadsHubBatchesIndex(nextIndex);
}

// Restore a single lead that was previously deleted. Used by frontend Undo.
export async function restoreLeadsHubLead(lead: LeadsHubLead): Promise<void> {
  const leads = await getLeadsHubBatch(lead.batchId);
  // Add it back
  leads.push(lead);
  await putLeadsHubBatch(lead.batchId, leads);

  // Update lead count in index
  const index = await listLeadsHubBatches();
  const nextIndex = index.map((b) => {
    if (b.id === lead.batchId) {
      return { ...b, leadCount: leads.length };
    }
    return b;
  });
  await writeLeadsHubBatchesIndex(nextIndex);
}

export async function getLeadsHubAllLeads(): Promise<LeadsHubLead[]> {
  const index = await listLeadsHubBatches();
  const allLeads: LeadsHubLead[] = [];
  for (const batch of index) {
    const leads = await getLeadsHubBatch(batch.id);
    allLeads.push(...leads);
  }
  // Sort by addedAt descending
  allLeads.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  return allLeads;
}
