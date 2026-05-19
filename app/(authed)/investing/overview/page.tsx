// Investing → Overview. Shows the effective user's current investment in
// Entheios plus admin-set projected growth across 1w / 4w / 3mo windows.

import { getEffectiveUser } from "@/lib/effective-user";
import { getInvestmentFor } from "@/lib/investments-store";

export const dynamic = "force-dynamic";

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function projected(amount: number, pct: number): number {
  return amount * (1 + pct / 100);
}

function pctClass(n: number): string {
  if (n > 0) return "text-emerald-600 dark:text-emerald-400";
  if (n < 0) return "text-rose-600 dark:text-rose-400";
  return "text-zinc-500 dark:text-zinc-400";
}

export default async function InvestingOverview() {
  const ctx = await getEffectiveUser();
  const record = await getInvestmentFor(ctx?.effectiveEmail);

  const invested = record?.invested ?? 0;
  const g1w = record?.growth1w ?? 0;
  const g4w = record?.growth4w ?? 0;
  const g3mo = record?.growth3mo ?? 0;

  const projections: { label: string; pct: number }[] = [
    { label: "1 week", pct: g1w },
    { label: "4 weeks", pct: g4w },
    { label: "3 months", pct: g3mo },
  ];

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your investment</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Current capital in Entheios and projected growth over upcoming windows.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Currently invested
        </div>
        <div className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
          {fmtUSD(invested)}
        </div>
        {record?.updatedAt && (
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Last updated {record.updatedAt.slice(0, 10)}
          </div>
        )}
      </div>

      <h2 className="mt-8 text-base font-semibold tracking-tight">Projected growth</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {projections.map((p) => {
          const future = projected(invested, p.pct);
          const delta = future - invested;
          return (
            <div
              key={p.label}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {p.label}
              </div>
              <div className={`mt-1 text-lg font-semibold ${pctClass(p.pct)}`}>
                {fmtPct(p.pct)}
              </div>
              <div className="mt-2 text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                {fmtUSD(future)}
              </div>
              <div className={`mt-0.5 text-[11px] tabular-nums ${pctClass(delta)}`}>
                {delta >= 0 ? "+" : ""}
                {fmtUSD(delta)}
              </div>
            </div>
          );
        })}
      </div>

      {!record && (
        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
          No investment on file yet. An admin will set this up for you shortly.
        </p>
      )}
    </section>
  );
}
