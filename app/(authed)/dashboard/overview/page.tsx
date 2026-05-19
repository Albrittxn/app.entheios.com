import Link from "next/link";
import { getCompanyMetrics } from "@/lib/company-metrics";
import { HUBS } from "@/lib/hubs";
import { HubIcon } from "@/components/hub-icon";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { BookingsTrend } from "@/components/dashboard/bookings-trend";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

// Company-wide rollup. Real numbers come from Closing → Calls; the other
// hubs report once their data is wired to a server-readable store.
export const dynamic = "force-dynamic";

export default async function CompanyOverview() {
  const { closing } = await getCompanyMetrics();

  return (
    <section className="relative">

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Company Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Every hub at a glance — outreach, calls, and closes across the whole
          company.
        </p>
      </header>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Discovery calls booked"
          value={closing.booked}
          delay={0}
          highlight
        />
        <KpiCard label="Upcoming" value={closing.upcoming} delay={0.06} />
        <KpiCard label="Closed" value={closing.closed} delay={0.12} />
        <KpiCard
          label="Show rate"
          value={closing.showRate}
          mode="percent"
          sub={
            closing.completed > 0
              ? `${closing.showed}/${closing.completed} showed`
              : "no calls yet"
          }
          placeholder={closing.completed === 0 ? "—" : undefined}
          delay={0.18}
        />
      </div>

      {/* Bookings trend */}
      <DashboardCard
        delay={0.28}
        className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Bookings trend
          </h2>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Daily — last 30 days
          </span>
        </div>
        <BookingsTrend data={closing.bookingsByDay} />
      </DashboardCard>

      {/* Funnel */}
      <DashboardCard
        delay={0.38}
        className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Funnel
          </h2>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Booked → Showed → Closed
          </span>
        </div>
        <FunnelChart
          booked={closing.booked}
          showed={closing.showed}
          closed={closing.closed}
        />
      </DashboardCard>

      {/* Per-hub status */}
      <h2 className="mt-10 mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        By hub
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HubLink
          hubId="atlas"
          blurb="SMS outreach"
          stat="Not yet reporting"
          delay={0.46}
        />
        <HubLink
          hubId="closing"
          blurb="Discovery calls"
          stat={`${closing.booked} booked · ${closing.upcoming} upcoming · ${closing.closed} closed`}
          live
          delay={0.52}
        />
        <HubLink
          hubId="sales"
          blurb="Cold calling"
          stat="Not yet reporting"
          delay={0.58}
        />
        <HubLink
          hubId="leads"
          blurb="Master database"
          stat="Not yet reporting"
          delay={0.64}
        />
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  mode,
  placeholder,
  delay,
  highlight = false,
}: {
  label: string;
  value: number;
  sub?: string;
  mode?: "integer" | "percent";
  /** When provided, renders this in place of the animated counter — used
   *  for "—" when there's no data to show yet. */
  placeholder?: string;
  delay: number;
  highlight?: boolean;
}) {
  return (
    <DashboardCard
      delay={delay}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white p-5 dark:bg-zinc-950",
        highlight
          ? "border-zinc-900 dark:border-zinc-100"
          : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div
        className={cn(
          "mt-1.5 text-2xl font-semibold tracking-tight tabular-nums",
          highlight
            ? "text-gold-deep dark:text-gold-soft"
            : "text-zinc-900 dark:text-zinc-100",
        )}
      >
        {placeholder ?? (
          <AnimatedCounter value={value} mode={mode} delay={delay} />
        )}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          {sub}
        </div>
      )}
    </DashboardCard>
  );
}

function HubLink({
  hubId,
  blurb,
  stat,
  live = false,
  delay,
}: {
  hubId: "atlas" | "closing" | "sales" | "leads";
  blurb: string;
  stat: string;
  live?: boolean;
  delay: number;
}) {
  const hub = HUBS[hubId];
  return (
    <DashboardCard delay={delay} className="h-full">
      <Link
        href={hub.defaultPath}
        className="group flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-gold/40 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-gold/40 dark:hover:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-2", hub.accentClass)}>
            <HubIcon id={hubId} className="h-4 w-4" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {hub.label}
            </span>
          </span>
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              live ? "bg-gold" : "bg-zinc-300 dark:bg-zinc-700",
            )}
          />
        </div>
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{blurb}</div>
          <div
            className={cn(
              "mt-1 text-sm",
              live
                ? "font-medium text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 dark:text-zinc-500",
            )}
          >
            {stat}
          </div>
        </div>
        <span className="mt-auto text-xs font-medium text-zinc-500 transition-colors group-hover:text-gold-deep dark:text-zinc-400 dark:group-hover:text-gold-soft">
          Open {hub.label} →
        </span>
      </Link>
    </DashboardCard>
  );
}
