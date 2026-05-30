// Leads Hub storage — backed by Supabase PostgreSQL.
// Tables: leads_hub_batches, leads_hub_leads, leads_hub_folders

import { getSupabase } from "@/lib/supabase";

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

// ── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBatch(row: any): LeadsHubBatch {
  return {
    id: row.id,
    name: row.name ?? "",
    fileName: row.file_name ?? "",
    leadCount: row.lead_count ?? 0,
    columns: row.columns ?? [],
    uploadedAt: row.uploaded_at ?? new Date().toISOString(),
    uploadedBy: row.uploaded_by ?? "",
    folder: row.folder ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLead(row: any): LeadsHubLead {
  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    brokerage: row.brokerage ?? "",
    state: row.state ?? "",
    addedAt: row.added_at ?? new Date().toISOString(),
    batchId: row.batch_id ?? "",
    batchName: row.batch_name ?? "",
  };
}

// ── Batches ──────────────────────────────────────────────────────────────────

export async function listLeadsHubBatches(): Promise<LeadsHubBatch[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("leads_hub_batches")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`listLeadsHubBatches: ${error.message}`);
  return (data ?? []).map(rowToBatch);
}

export async function addLeadsHubBatch(
  meta: LeadsHubBatch,
  leads: LeadsHubLead[],
): Promise<void> {
  const sb = getSupabase();

  // Upsert batch metadata
  const { error: batchErr } = await sb.from("leads_hub_batches").upsert({
    id: meta.id,
    name: meta.name,
    file_name: meta.fileName,
    lead_count: leads.length,
    columns: meta.columns,
    uploaded_at: meta.uploadedAt,
    uploaded_by: meta.uploadedBy,
    folder: meta.folder,
  });
  if (batchErr) throw new Error(`addLeadsHubBatch (meta): ${batchErr.message}`);

  // Insert leads in batches of 500 to avoid payload limits
  if (leads.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < leads.length; i += CHUNK) {
    const chunk = leads.slice(i, i + CHUNK).map((l) => ({
      id: l.id,
      batch_id: l.batchId,
      batch_name: l.batchName,
      first_name: l.firstName,
      last_name: l.lastName,
      email: l.email,
      phone: l.phone,
      brokerage: l.brokerage,
      state: l.state,
      added_at: l.addedAt,
    }));
    // eslint-disable-next-line no-await-in-loop
    const { error: leadErr } = await sb.from("leads_hub_leads").upsert(chunk);
    if (leadErr) throw new Error(`addLeadsHubBatch (leads chunk ${i}): ${leadErr.message}`);
  }

  // Ensure folder exists if one was specified
  if (meta.folder) {
    await sb.from("leads_hub_folders").upsert({ name: meta.folder }).then(() => void 0);
  }
}

export async function deleteLeadsHubBatch(id: string): Promise<void> {
  const sb = getSupabase();
  // Leads are deleted automatically via ON DELETE CASCADE
  const { error } = await sb.from("leads_hub_batches").delete().eq("id", id);
  if (error) throw new Error(`deleteLeadsHubBatch: ${error.message}`);
}

export async function updateLeadsHubBatchFolder(
  id: string,
  folder: string,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("leads_hub_batches")
    .update({ folder: folder.trim().slice(0, 120) })
    .eq("id", id);
  if (error) throw new Error(`updateLeadsHubBatchFolder: ${error.message}`);
}

// ── Leads ────────────────────────────────────────────────────────────────────

export async function getLeadsHubBatch(batchId: string): Promise<LeadsHubLead[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("leads_hub_leads")
    .select("*")
    .eq("batch_id", batchId)
    .order("added_at", { ascending: false });
  if (error) throw new Error(`getLeadsHubBatch: ${error.message}`);
  return (data ?? []).map(rowToLead);
}

export async function getLeadsHubAllLeads(): Promise<LeadsHubLead[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("leads_hub_leads")
    .select("*")
    .order("added_at", { ascending: false });
  if (error) throw new Error(`getLeadsHubAllLeads: ${error.message}`);
  return (data ?? []).map(rowToLead);
}

export async function deleteLeadsHubLead(
  batchId: string,
  leadId: string,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("leads_hub_leads")
    .delete()
    .eq("id", leadId)
    .eq("batch_id", batchId);
  if (error) throw new Error(`deleteLeadsHubLead: ${error.message}`);

  // Keep lead_count in sync
  const { count } = await sb
    .from("leads_hub_leads")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);
  await sb
    .from("leads_hub_batches")
    .update({ lead_count: count ?? 0 })
    .eq("id", batchId);
}

export async function restoreLeadsHubLead(lead: LeadsHubLead): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("leads_hub_leads").upsert({
    id: lead.id,
    batch_id: lead.batchId,
    batch_name: lead.batchName,
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    brokerage: lead.brokerage,
    state: lead.state,
    added_at: lead.addedAt,
  });
  if (error) throw new Error(`restoreLeadsHubLead: ${error.message}`);

  // Keep lead_count in sync
  const { count } = await sb
    .from("leads_hub_leads")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", lead.batchId);
  await sb
    .from("leads_hub_batches")
    .update({ lead_count: count ?? 0 })
    .eq("id", lead.batchId);
}

// ── Folders ──────────────────────────────────────────────────────────────────

export async function listLeadsHubFolders(): Promise<string[]> {
  const sb = getSupabase();
  const [foldersRes, batchesRes] = await Promise.all([
    sb.from("leads_hub_folders").select("name").order("name"),
    sb.from("leads_hub_batches").select("folder"),
  ]);
  const explicit = (foldersRes.data ?? []).map((r) => r.name as string);
  const fromBatches = (batchesRes.data ?? [])
    .map((r) => (r.folder as string).trim())
    .filter(Boolean);
  return [...new Set([...explicit, ...fromBatches])].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
  );
}

export async function createLeadsHubFolder(folder: string): Promise<string> {
  const name = folder.trim().slice(0, 120);
  if (!name) throw new Error("Folder name required");
  const sb = getSupabase();
  const { error } = await sb.from("leads_hub_folders").upsert({ name });
  if (error) throw new Error(`createLeadsHubFolder: ${error.message}`);
  return name;
}

export async function deleteLeadsHubFolder(folder: string): Promise<void> {
  const name = folder.trim();
  if (!name) throw new Error("Folder name required");
  const sb = getSupabase();
  // Move batches in this folder to Unsorted
  await sb
    .from("leads_hub_batches")
    .update({ folder: "" })
    .eq("folder", name);
  // Remove from explicit folders list
  await sb.from("leads_hub_folders").delete().eq("name", name);
}
