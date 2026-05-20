import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectiveUser } from "@/lib/effective-user";
import { isAdminEmail } from "@/lib/permissions";
import {
  listLeadsHubBatches,
  listLeadsHubFolders,
  createLeadsHubFolder,
  deleteLeadsHubFolder,
  addLeadsHubBatch,
  deleteLeadsHubBatch,
  updateLeadsHubBatchFolder,
  randomId,
  type LeadsHubBatch,
  type LeadsHubLead,
} from "@/lib/leads-hub-store";
import {
  formatName,
  formatPhone,
  formatEmail,
  formatBrokerage,
  formatState,
} from "@/lib/format";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await getEffectiveUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [index, folders] = await Promise.all([listLeadsHubBatches(), listLeadsHubFolders()]);
  return NextResponse.json({ batches: index, folders });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as {
    id?: unknown;
    name?: unknown;
    fileName?: unknown;
    uploadedAt?: unknown;
    folder?: unknown;
    leads?: unknown;
    createFolder?: unknown;
  };

  const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
  const fileName = typeof b.fileName === "string" ? b.fileName.trim() : "";
  const folder = typeof b.folder === "string" ? b.folder.trim().slice(0, 120) : "";
  const rawLeads = Array.isArray(b.leads) ? b.leads : [];
  const createFolderOnly = Boolean(b.createFolder);

  if (createFolderOnly) {
    if (!folder) return NextResponse.json({ error: "Folder name required" }, { status: 400 });
    try {
      const created = await createLeadsHubFolder(folder);
      return NextResponse.json({ ok: true, folder: created });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create folder.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (rawLeads.length === 0) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }

  const batchId = typeof b.id === "string" && b.id ? b.id : `lhb_${randomId(8)}`;
  const uploadedAt = typeof b.uploadedAt === "string" && b.uploadedAt ? b.uploadedAt : new Date().toISOString();

  // Deduplicate phone numbers within the imported file itself, and format fields
  const formattedLeads: LeadsHubLead[] = [];
  const phonesSeen = new Set<string>();

  for (const raw of rawLeads) {
    const r = raw as Record<string, unknown>;
    const phone = formatPhone(String(r.phone ?? ""));
    if (!phone || phonesSeen.has(phone)) continue;
    phonesSeen.add(phone);

    formattedLeads.push({
      id: typeof r.id === "string" && r.id ? r.id : `lhl_${randomId(8)}`,
      firstName: formatName(String(r.firstName ?? "")),
      lastName: formatName(String(r.lastName ?? "")),
      email: formatEmail(String(r.email ?? "")),
      phone,
      brokerage: formatBrokerage(String(r.brokerage ?? "")),
      state: formatState(String(r.state ?? "")),
      addedAt: typeof r.addedAt === "string" && r.addedAt ? r.addedAt : uploadedAt,
      batchId,
      batchName: name,
    });
  }

  const meta: LeadsHubBatch = {
    id: batchId,
    name,
    fileName,
    leadCount: formattedLeads.length,
    columns: ["firstName", "lastName", "email", "phone", "brokerage", "state"],
    uploadedAt,
    uploadedBy: session.email.toLowerCase(),
    folder,
  };

  try {
    await addLeadsHubBatch(meta, formattedLeads);
    return NextResponse.json({ ok: true, batch: meta, leads: formattedLeads });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save imported leads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { id?: unknown; folder?: unknown };
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const folder = typeof payload.folder === "string" ? payload.folder.trim().slice(0, 120) : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await updateLeadsHubBatchFolder(id, folder);
    const batches = await listLeadsHubBatches();
    const batch = batches.find((b) => b.id === id);
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update batch folder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const folder = url.searchParams.get("folder")?.trim() ?? "";
  if (folder) {
    try {
      await deleteLeadsHubFolder(folder);
      return NextResponse.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete folder.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await deleteLeadsHubBatch(id);
  return NextResponse.json({ ok: true });
}
