import { getEffectiveUser } from "@/lib/effective-user";
import { isAdminEmail } from "@/lib/permissions";
import { AdminBatchToolsPanel } from "./admin-batch-tools-panel";
import { SalesLeadsView } from "./leads-view";

export default async function SalesLeadsPage() {
  const ctx = await getEffectiveUser();
  const isAdmin = Boolean(ctx && isAdminEmail(ctx.effectiveEmail));
  const canPersistDownloadStatus = !ctx?.impersonating;

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Lead batches grouped by folder so the team can find the right list quickly and download the CSV into GHL.
        </p>
      </header>
      {isAdmin && <AdminBatchToolsPanel />}
      <SalesLeadsView isAdmin={isAdmin} canPersistDownloadStatus={canPersistDownloadStatus} />
    </section>
  );
}
