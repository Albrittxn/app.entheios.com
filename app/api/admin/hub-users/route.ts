// POST   /api/admin/hub-users  { email, firstName, lastName, hub, sendWelcome? }
// DELETE /api/admin/hub-users?email=…&hub=…    → remove user from hub
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { HUBS, HUB_ORDER, type HubId } from "@/lib/hubs";
import { addUserToHub, removeUserFromHub } from "@/lib/hub-users";
import { sendWelcomeEmail } from "@/lib/email";

function asHub(v: unknown): HubId | null {
  return typeof v === "string" && (HUB_ORDER as string[]).includes(v) ? (v as HubId) : null;
}

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
  const b = body as {
    email?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    hub?: unknown;
    sendWelcome?: unknown;
  };
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const firstName = typeof b.firstName === "string" ? b.firstName.trim() : "";
  const lastName = typeof b.lastName === "string" ? b.lastName.trim() : "";
  const hub = asHub(b.hub);
  const sendWelcome = b.sendWelcome === true;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!firstName) return NextResponse.json({ error: "First name required" }, { status: 400 });
  if (!hub) return NextResponse.json({ error: "Hub required" }, { status: 400 });
  try {
    const user = await addUserToHub(email, hub, { firstName, lastName });
    let welcomeSent = false;
    let welcomeError: string | undefined;
    if (sendWelcome) {
      try {
        await sendWelcomeEmail(email, firstName, HUBS[hub].label);
        welcomeSent = true;
      } catch (err) {
        welcomeError = err instanceof Error ? err.message : "Could not send welcome email.";
      }
    }
    return NextResponse.json({ ok: true, user, welcomeSent, welcomeError });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  const hub = asHub(url.searchParams.get("hub"));
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!hub) return NextResponse.json({ error: "hub required" }, { status: 400 });
  try {
    await removeUserFromHub(email, hub);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
