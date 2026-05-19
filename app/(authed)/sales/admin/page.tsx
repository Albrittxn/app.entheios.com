import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { SalesAdminView } from "./sales-admin-view";
import { HubUsersPanel } from "@/components/hub-users-panel";

export default async function SalesAdmin() {
  const session = await getSession();
  if (!isAdminEmail(session?.email)) redirect("/sales/dashboard");

  return (
    <section className="space-y-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sales Admin</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage Sales-hub users and upload lead batches.
        </p>
      </header>
      <HubUsersPanel hub="sales" label="Sales" />
      <div>
        <h2 className="mb-1 text-base font-semibold tracking-tight">Batches</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Upload CSVs that appear in every caller's Leads tab.
        </p>
        <div className="mt-4">
          <SalesAdminView />
        </div>
      </div>
    </section>
  );
}
