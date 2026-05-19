import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { HubUsersPanel } from "@/components/hub-users-panel";

export default async function LeadsAdmin() {
  const session = await getSession();
  if (!isAdminEmail(session?.email)) redirect("/leads");

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Leads Admin</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage who can see the Leads hub.
        </p>
      </header>
      <HubUsersPanel hub="leads" label="Leads" />
    </section>
  );
}
