// Per-user hub access. Admin (ryan@entheios.com) always gets all hubs;
// non-admin users get whatever's in their record's `hubs` field. The hub
// list is read straight from Edge Config so we don't depend on
// permissions.ts's projection (which intentionally strips `hubs`).

import { get } from "@vercel/edge-config";
import { isAdminEmail } from "@/lib/permissions";
import { HUB_ORDER, type HubId } from "@/lib/hubs";

export async function userHubs(email: string | undefined | null): Promise<HubId[]> {
  if (!email) return [];
  if (isAdminEmail(email)) return [...HUB_ORDER];
  if (!process.env.EDGE_CONFIG) return [];
  let raw: unknown;
  try {
    raw = await get<unknown>("allowed_emails");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const e = email.toLowerCase();
  const row = raw.find(
    (r) =>
      !!r &&
      typeof r === "object" &&
      typeof (r as { email?: unknown }).email === "string" &&
      (r as { email: string }).email.toLowerCase() === e,
  ) as { hubs?: unknown } | undefined;
  const hubs = row?.hubs;
  if (!Array.isArray(hubs)) return [];
  return hubs.filter((id): id is HubId => (HUB_ORDER as string[]).includes(id as string));
}

export async function canAccessHub(
  email: string | undefined | null,
  hub: HubId,
): Promise<boolean> {
  const hubs = await userHubs(email);
  return hubs.includes(hub);
}
