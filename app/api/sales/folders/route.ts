import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { addBatchFolder, listBatchFolders } from "@/lib/sales-batches";

export async function GET() {
  const folders = await listBatchFolders();
  return NextResponse.json({ folders });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const folder =
    typeof (body as { folder?: unknown }).folder === "string"
      ? (body as { folder: string }).folder
      : "";
  if (!folder.trim()) return NextResponse.json({ error: "Folder name required." }, { status: 400 });

  try {
    const folders = await addBatchFolder(folder);
    return NextResponse.json({ ok: true, folders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create folder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
