import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { HubUsersPanel } from "@/components/hub-users-panel";

export default async function ClosingAdmin() {
  const session = await getSession();
  if (!isAdminEmail(session?.email)) redirect("/closing/calls");

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Closing Admin</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage the closer roster. Per-closer call data + "Preview as" lives in the Admin tab dropdown in the nav.
        </p>
      </header>
      <HubUsersPanel hub="closing" label="Closing" />
    </section>
  );
}
