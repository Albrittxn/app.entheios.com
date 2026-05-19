// Closing → Calls. Reads real bookings from Edge Config (populated by the
// cal.com webhook). Admins can filter by assigned closer via ?closer=email.

import { splitUpcomingPast } from "@/lib/closing-leads";
import { readStoredLeads } from "@/lib/closing-leads-store";
import { getEffectiveUser } from "@/lib/effective-user";
import { listUsersForHub, type RawUser } from "@/lib/hub-users";
import { ADMIN_EMAIL } from "@/lib/permissions";
import { CallsList, type CloserOption } from "@/components/closing/calls-list";

export const dynamic = "force-dynamic";

export default async function ClosingCalls({
  searchParams,
}: {
  searchParams: Promise<{ closer?: string }>;
}) {
  const ctx = await getEffectiveUser();
  const sp = await searchParams;
  // Impersonating counts as "not admin" here, so the page matches the
  // impersonated closer exactly — their calls only, no filter chips.
  const isAdmin = !ctx?.impersonating && !!ctx?.actorIsAdmin;

  const [stored, hubUsers] = await Promise.all([
    readStoredLeads(),
    isAdmin ? listUsersForHub("closing").catch(() => [] as RawUser[]) : Promise.resolve([] as RawUser[]),
  ]);

  // Closer filter: admins can filter by any closer email; non-admins always
  // see only their own assigned bookings.
  const activeCloser = isAdmin ? (sp.closer ?? "all") : (ctx?.effectiveEmail ?? "all");
  const filtered = activeCloser === "all"
    ? stored
    : stored.filter((l) => (l.closerEmail ?? "").toLowerCase() === activeCloser.toLowerCase());

  const { upcoming, past } = splitUpcomingPast(filtered);

  // Build closer options: every hub user except the super admin shown as
  // available; super admin (Ryan) shown first since they're always a closer.
  const closers: CloserOption[] = hubUsers
    .map((u) => {
      const first = u.name?.trim().split(/\s+/)[0];
      return { email: u.email, name: first || u.email.split("@")[0] };
    })
    .sort((a, b) => {
      if (a.email === ADMIN_EMAIL) return -1;
      if (b.email === ADMIN_EMAIL) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Calls</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Booked discovery calls. Click a row to see lead context + log the outcome.
        </p>
      </header>

      <CallsList
        upcoming={upcoming}
        past={past}
        closers={closers}
        activeCloser={activeCloser}
        isAdmin={isAdmin}
      />
    </section>
  );
}
