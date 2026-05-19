// Impersonation context. The actor (real signed-in user) can be different
// from the effective user (whose data is being viewed). Admin can set a
// view-as cookie to "Preview as" any allowlisted user — reads scope to the
// effective email; writes are still allowed (admin acts on behalf of user).

import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";

const VIEW_AS_COOKIE = "atlas_view_as";

export type EffectiveContext = {
  actorEmail: string;
  effectiveEmail: string;
  impersonating: boolean;
  actorIsAdmin: boolean;
};

export async function getEffectiveUser(): Promise<EffectiveContext | null> {
  const session = await getSession();
  if (!session?.email) return null;
  const actorEmail = session.email.toLowerCase();
  const actorIsAdmin = isAdminEmail(actorEmail);

  const c = await cookies();
  const viewAs = c.get(VIEW_AS_COOKIE)?.value?.toLowerCase().trim();

  if (viewAs && actorIsAdmin && viewAs !== actorEmail) {
    return {
      actorEmail,
      effectiveEmail: viewAs,
      impersonating: true,
      actorIsAdmin,
    };
  }
  return {
    actorEmail,
    effectiveEmail: actorEmail,
    impersonating: false,
    actorIsAdmin,
  };
}

export async function setViewAs(email: string): Promise<void> {
  const c = await cookies();
  c.set(VIEW_AS_COOKIE, email.toLowerCase().trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function clearViewAs(): Promise<void> {
  const c = await cookies();
  c.delete(VIEW_AS_COOKIE);
}
