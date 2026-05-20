import { getCompanyMetrics } from "@/lib/company-metrics";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalesDashboard() {
  const { closing } = await getCompanyMetrics();

  return (
    <section className="relative">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Track all calls booked through your cold calling efforts — status,
          outcomes, and conversion metrics.
        </p>
      </header>

      {/* Calls Booked KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard delay={0} className="h-full">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Calls Booked
            </div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              <AnimatedCounter value={closing.booked} />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard delay={0.06} className="h-full">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Upcoming
            </div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              <AnimatedCounter value={closing.upcoming} />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard delay={0.12} className="h-full">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Completed
            </div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              <AnimatedCounter value={closing.completed} />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard delay={0.18} className="h-full">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Closed
            </div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              <AnimatedCounter value={closing.closed} />
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Show Rate & Close Rate */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardCard delay={0.24} className="h-full">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Show Rate
            </div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              {(closing.showRate * 100).toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {closing.showed} of {closing.completed} showed
            </div>
          </div>
        </DashboardCard>

        <DashboardCard delay={0.3} className="h-full">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Close Rate
            </div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              {(closing.closeRate * 100).toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {closing.closed} of {closing.showed} closed
            </div>
          </div>
        </DashboardCard>
      </div>
    </section>
  );
}
