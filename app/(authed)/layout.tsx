import { redirect } from "next/navigation";
import {
  getUserRecord,
  isAdminEmail,
  isAllowed,
  ADMIN_EMAIL,
} from "@/lib/permissions";
import { userHubs } from "@/lib/hub-access";
import { listUsersByHub } from "@/lib/hub-users";
import { HUB_ORDER, type HubId } from "@/lib/hubs";
import { getEffectiveUser } from "@/lib/effective-user";
import { AppShell } from "@/components/app-shell";
import type { AdminMenuUser } from "@/components/admin-tab-menu";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getEffectiveUser();
  if (!ctx) redirect("/login");
  if (!(await isAllowed(ctx.actorEmail))) redirect("/login");

  // While impersonating, the entire UI reflects the impersonated user — their
  // name, their hubs, no admin chrome — so it's a genuine view of what they
  // see. The amber "Previewing as" banner is gated on `impersonating` (not
  // `admin`), so the actor can always exit. `effectiveEmail` equals
  // `actorEmail` when not impersonating, so normal sessions are unaffected.
  const uiEmail = ctx.effectiveEmail;
  const admin = isAdminEmail(uiEmail);
  const record = await getUserRecord(uiEmail);
  const displayName = record?.name ?? uiEmail;
  const availableHubs = await userHubs(uiEmail);

  // Admin gets a per-hub "preview as" list — only users with access to that
  // hub, so the Admin dropdown on each hub is scoped to that hub's members.
  let adminUsersByHub: Partial<Record<HubId, AdminMenuUser[]>> = {};
  if (admin) {
    const byHub = await listUsersByHub();
    adminUsersByHub = Object.fromEntries(
      HUB_ORDER.map((hub) => [
        hub,
        byHub[hub].map((u) => ({
          email: u.email,
          name: u.name,
          isAdmin: u.email === ADMIN_EMAIL || isAdminEmail(u.email),
        })),
      ]),
    );
  }

  return (
    <AppShell
      actorEmail={ctx.actorEmail}
      effectiveEmail={ctx.effectiveEmail}
      displayName={displayName}
      profilePictureUrl={record?.profilePictureUrl}
      admin={admin}
      impersonating={ctx.impersonating}
      availableHubs={availableHubs}
      adminUsersByHub={adminUsersByHub}
    >
      {children}
    </AppShell>
  );
}
