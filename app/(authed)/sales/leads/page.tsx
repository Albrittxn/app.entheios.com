import { getEffectiveUser } from "@/lib/effective-user";
import { isAdminEmail } from "@/lib/permissions";
import { SalesAdminView } from "../admin/sales-admin-view";
import { SalesLeadsView } from "./leads-view";

export default async function SalesLeadsPage() {
  const ctx = await getEffectiveUser();
  const isAdmin = Boolean(ctx && isAdminEmail(ctx.effectiveEmail));

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Lead batches grouped by folder so the team can find the right list quickly and download the CSV into GHL.
        </p>
      </header>
      {isAdmin && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold tracking-tight">Admin batch tools</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Create Sales batches here instead of jumping over to the Admin tab.
          </p>
          <div className="mt-3">
            <SalesAdminView />
          </div>
        </div>
      )}
      <SalesLeadsView isAdmin={isAdmin} />
    </section>
  );
}
