import { getCompanyMetrics } from "@/lib/company-metrics";
import { getLeadsHubAllLeads, listLeadsHubBatches } from "@/lib/leads-hub-store";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StateMetric = {
  state: string;
  dials: number;
  bookings: number;
  ratio: number;
};

export default async function SalesDashboard() {
  const { closing } = await getCompanyMetrics();
  
  // Get all leads to count downloaded leads and group by state
  const allLeads = await getLeadsHubAllLeads();
  const batches = await listLeadsHubBatches();
  
  // Count total downloaded leads
  const totalDownloadedLeads = batches.reduce((sum, b) => sum + b.leadCount, 0);
  
  // Calculate dials to bookings ratio
  const dialsToBookings = totalDownloadedLeads > 0 
    ? (closing.booked / totalDownloadedLeads).toFixed(3)
    : "0.000";
  
  // Group leads by state and calculate metrics
  const stateMetrics = new Map<string, StateMetric>();
  for (const lead of allLeads) {
    const state = lead.state || "Unknown";
    if (!stateMetrics.has(state)) {
      stateMetrics.set(state, {
        state,
        dials: 0,
        bookings: 0,
        ratio: 0,
      });
    }
    const metric = stateMetrics.get(state)!;
    metric.dials += 1;
  }
  
  // Add booking counts per state from closing leads
  for (const closingLead of closing.bookingsByDay || []) {
    // Note: closing leads include market/state, calculate from closing data
  }
  
  // Sort states by dial count
  const sortedStates = Array.from(stateMetrics.values())
    .sort((a, b) => b.dials - a.dials)
    .slice(0, 10);

  return (
    <section className="relative">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Cold calling performance — bookings, conversion rates, and geographic breakdown.
        </p>
      </header>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        {/* Calls Booked - Highlight Card */}
        <DashboardCard delay={0} className="h-full">
          <div className="rounded-xl border-2 border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-6 dark:border-gold-soft/30 dark:from-gold-soft/10">
            <div className="text-xs font-medium uppercase tracking-widest text-gold dark:text-gold-soft">
              Calls Booked
            </div>
            <div className="mt-3 text-4xl font-bold text-gold-deep dark:text-gold-soft">
              <AnimatedCounter value={closing.booked} />
            </div>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              From Cal.com webhook
            </div>
          </div>
        </DashboardCard>

        {/* Dials to Bookings Ratio */}
        <DashboardCard delay={0.08} className="h-full">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Dials to Bookings
            </div>
            <div className="mt-3 text-4xl font-bold text-zinc-900 dark:text-zinc-100">
              {dialsToBookings}
            </div>
            <div className="mt-2 flex items-baseline gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{closing.booked} booked</span>
              <span>÷</span>
              <span>{totalDownloadedLeads} leads</span>
            </div>
          </div>
        </DashboardCard>

        {/* Total Downloaded Leads */}
        <DashboardCard delay={0.16} className="h-full">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Downloaded Leads
            </div>
            <div className="mt-3 text-4xl font-bold text-zinc-900 dark:text-zinc-100">
              <AnimatedCounter value={totalDownloadedLeads} />
            </div>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              {batches.length} batch{batches.length === 1 ? "" : "es"}
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* State Breakdown */}
      <DashboardCard delay={0.24} className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Top States by Lead Volume
          </h2>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Top 10
          </span>
        </div>

        {sortedStates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
            No geographic data available yet. Download leads to see breakdown.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedStates.map((state, idx) => {
              const maxDials = sortedStates[0]?.dials || 1;
              const barPercent = (state.dials / maxDials) * 100;
              return (
                <div key={state.state} className="flex items-end gap-3">
                  <div className="w-10 text-right">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {state.state}
                    </div>
                    <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {state.dials}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700 transition-all duration-500"
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      #{idx + 1}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardCard>
    </section>
  );
}
