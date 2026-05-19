import { SalesLeadsView } from "./leads-view";

export default function SalesLeadsPage() {
  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Lead batches — download the CSV, import to GHL, mark complete when dialed. Each batch is ~100 leads.
        </p>
      </header>
      <SalesLeadsView />
    </section>
  );
}
