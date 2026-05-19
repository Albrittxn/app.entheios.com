import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addAllowedEmail, removeAllowedEmail, listAllowedEmails } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const emails = await listAllowedEmails();
  return NextResponse.json({ emails });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const email = String(body.email ?? "");
  try {
    await addAllowedEmail(email);
    const emails = await listAllowedEmails();
    return NextResponse.json({ ok: true, emails });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Could not add email." },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  try {
    await removeAllowedEmail(email);
    const emails = await listAllowedEmails();
    return NextResponse.json({ ok: true, emails });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Could not remove email." },
      { status: 400 },
    );
  }
}
