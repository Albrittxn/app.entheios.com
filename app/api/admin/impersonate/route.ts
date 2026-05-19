// POST /api/admin/impersonate  { email }  → set view-as cookie
// DELETE /api/admin/impersonate           → clear view-as cookie
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminEmail, isAllowed } from "@/lib/permissions";
import { setViewAs, clearViewAs } from "@/lib/effective-user";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = (body as { email?: unknown })?.email;
  const target =
    typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (!target) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Clearing — actor previewing themselves cancels impersonation.
  if (target === session.email.toLowerCase()) {
    await clearViewAs();
    return NextResponse.json({ ok: true, cleared: true });
  }

  if (!(await isAllowed(target)))
    return NextResponse.json({ error: "User not on allowlist" }, { status: 404 });

  await setViewAs(target);
  return NextResponse.json({ ok: true, viewing: target });
}

export async function DELETE() {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await clearViewAs();
  return NextResponse.json({ ok: true });
}
