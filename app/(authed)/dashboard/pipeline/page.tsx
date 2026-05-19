import { getCompanyMetrics } from "@/lib/company-metrics";
import { cn } from "@/lib/utils";

// The company funnel — raw lead all the way to a closed deal. Booked /
// Showed / Closed are live from Closing → Calls; the upstream stages light
// up once Atlas + Leads data is wired to a server-readable store.
export const dynamic = "force-dynamic";

type Stage = {
  name: string;
  desc: string;
  // null = data source not wired yet
  count: number | null;
};

export default async function CompanyPipeline() {
  const { closing } = await getCompanyMetrics();

  const stages: Stage[] = [
    { name: "Leads", desc: "In the master database", count: null },
    { name: "Outreach sent", desc: "SMS sent via Atlas", count: null },
    { name: "Calls booked", desc: "Discovery calls on the calendar", count: closing.booked },
    { name: "Showed", desc: "Prospect attended the call", count: closing.showed },
    { name: "Closed", desc: "Signed and paid", count: closing.closed },
  ];

  const known = stages.map((s) => s.count).filter((c): c is number => c !== null);
  const max = Math.max(1, ...known);

  return (
    <section>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The company funnel — from raw lead to closed deal.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {stages.map((stage, i) => {
            const wired = stage.count !== null;
            // Conversion from the nearest previous wired stage.
            let conversion: string | null = null;
            for (let j = i - 1; j >= 0; j--) {
              const prev = stages[j].count;
              if (prev !== null && wired) {
                conversion = prev > 0 ? `${Math.round((stage.count! / prev) * 100)}%` : "—";
                break;
              }
            }
            return (
              <li
                key={stage.name}
                className="grid grid-cols-[10rem_1fr_auto] items-center gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {stage.name}
                  </div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {stage.desc}
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                  {wired && (
                    <div
                      className="h-full rounded-full bg-sky-500 dark:bg-sky-400"
                      style={{ width: `${Math.round((stage.count! / max) * 100)}%` }}
                    />
                  )}
                </div>

                <div className="flex w-28 shrink-0 items-baseline justify-end gap-2">
                  {conversion && (
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {conversion}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      wired
                        ? "text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-300 dark:text-zinc-700",
                    )}
                  >
                    {wired ? stage.count!.toLocaleString() : "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Booked, Showed, and Closed are live from Closing → Calls. Leads and
        Outreach light up once those hubs report to the company rollup.
      </p>
    </section>
  );
}
