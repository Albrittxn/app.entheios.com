// GET /api/admin/hub-users/list?hub=…  → users with this hub's access
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ADMIN_EMAIL, isAdminEmail } from "@/lib/permissions";
import { HUB_ORDER, type HubId } from "@/lib/hubs";
import { listUsersForHub } from "@/lib/hub-users";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const hubRaw = url.searchParams.get("hub") ?? "";
  if (!(HUB_ORDER as string[]).includes(hubRaw))
    return NextResponse.json({ error: "hub required" }, { status: 400 });
  const hub = hubRaw as HubId;
  const users = await listUsersForHub(hub);
  return NextResponse.json({
    users: users.map((u) => ({
      email: u.email,
      name: u.name,
      added_at: u.added_at,
      hubs: u.hubs ?? [],
      isAdmin: u.email === ADMIN_EMAIL,
    })),
  });
}
