// Company-wide rollup for the Dashboard hub.
//
// The only fully-wired data source today is Closing → Calls (real bookings
// in Edge Config, populated by the Cal.com webhook). Atlas / Sales / Leads
// metrics aren't piped to a server-readable store yet, so they report as
// "not yet wired" — the shape is here for when they are.

import { readStoredLeads } from "@/lib/closing-leads-store";
import type { Lead, LeadStatus } from "@/lib/closing-leads";

export type ClosingMetrics = {
  /** Active bookings — everything except cancellations. */
  booked: number;
  cancelled: number;
  /** Future-dated, not cancelled. */
  upcoming: number;
  /** Past-dated, not cancelled. */
  completed: number;
  /** Completed calls the prospect actually showed for. */
  showed: number;
  noShow: number;
  /** Status === "Closed". */
  closed: number;
  /** showed / completed. 0 when no calls have happened yet. */
  showRate: number;
  /** closed / showed. 0 when nobody has shown yet. */
  closeRate: number;
  /** Bookings landed per day for the last TREND_DAYS window (oldest first),
   *  used by the dashboard trend chart. */
  bookingsByDay: DayBucket[];
  /** Count by current status — feeds the dashboard breakdown chart. */
  statusBreakdown: StatusBucket[];
};

export type DayBucket = { date: string; count: number };
export type StatusBucket = { status: LeadStatus; count: number };

export type CompanyMetrics = {
  closing: ClosingMetrics;
};

const TREND_DAYS = 30;

function utcDayKey(d: Date): string {
  // YYYY-MM-DD in UTC.
  return d.toISOString().slice(0, 10);
}

function computeClosing(leads: Lead[]): ClosingMetrics {
  const now = Date.now();
  const active = leads.filter((l) => l.status !== "Cancelled");
  const completed = active.filter(
    (l) => new Date(l.meetingTimeIso).getTime() < now,
  );
  const noShow = completed.filter((l) => l.status === "No-Show").length;
  const showed = completed.length - noShow;
  const closed = active.filter((l) => l.status === "Closed").length;

  // Pre-seed an ordered map of the last TREND_DAYS days at 0, then bump as
  // bookings land — that way the chart has a flat baseline instead of gaps.
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    buckets.set(utcDayKey(d), 0);
  }
  for (const l of leads) {
    const stamp = l.createdAt ?? l.meetingTimeIso;
    const key = stamp.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const bookingsByDay: DayBucket[] = [...buckets.entries()].map(
    ([date, count]) => ({ date, count }),
  );

  const statusCount = new Map<LeadStatus, number>();
  for (const l of leads) {
    statusCount.set(l.status, (statusCount.get(l.status) ?? 0) + 1);
  }
  const statusBreakdown: StatusBucket[] = [...statusCount.entries()].map(
    ([status, count]) => ({ status, count }),
  );

  return {
    booked: active.length,
    cancelled: leads.length - active.length,
    upcoming: active.filter(
      (l) => new Date(l.meetingTimeIso).getTime() >= now,
    ).length,
    completed: completed.length,
    showed,
    noShow,
    closed,
    showRate: completed.length ? showed / completed.length : 0,
    closeRate: showed ? closed / showed : 0,
    bookingsByDay,
    statusBreakdown,
  };
}

export async function getCompanyMetrics(): Promise<CompanyMetrics> {
  const leads = await readStoredLeads();
  return { closing: computeClosing(leads) };
}
