// POST /api/admin/hub-users/send-signin  { email, firstName, hub }
// Re-sends the welcome / sign-in-link email to an existing user.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { HUBS, HUB_ORDER, type HubId } from "@/lib/hubs";
import { sendWelcomeEmail } from "@/lib/email";

function asHub(v: unknown): HubId | null {
  return typeof v === "string" && (HUB_ORDER as string[]).includes(v)
    ? (v as HubId)
    : null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as { email?: unknown; firstName?: unknown; hub?: unknown };
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const firstName = typeof b.firstName === "string" ? b.firstName.trim() : "";
  const hub = asHub(b.hub);
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!hub) return NextResponse.json({ error: "Hub required" }, { status: 400 });

  try {
    await sendWelcomeEmail(email, firstName, HUBS[hub].label);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send email" },
      { status: 500 },
    );
  }
}
