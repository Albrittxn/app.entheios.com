import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { SalesAdminView } from "../admin/sales-admin-view";
import { SalesLeadsView } from "./leads-view";

export default async function SalesLeadsPage() {
  const session = await getSession();
  const isAdmin = isAdminEmail(session?.email);

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Lead batches — download the CSV, import to GHL, mark complete when dialed. Each batch is ~100 leads.
        </p>
      </header>
      {isAdmin && (
        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-base font-semibold tracking-tight">Admin batch tools</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create Sales batches here instead of jumping over to the Admin tab.
          </p>
          <div className="mt-4">
            <SalesAdminView />
          </div>
        </div>
      )}
      <SalesLeadsView />
    </section>
  );
}
