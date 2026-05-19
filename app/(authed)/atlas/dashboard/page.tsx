import Link from "next/link";
import type {
  Campaign,
  StatePerf,
  Template,
  UpcomingMeeting,
} from "@/lib/types";
import { getDashboardSample } from "@/lib/dashboard-sample";
import { SendsPanel } from "./sends-panel";
import { RefreshButton } from "@/components/refresh-button";
import { cn } from "@/lib/utils";

// Time-based sample data — recompute on every request so the numbers grow
// in real-realistic time over the 7-day demo window.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // Pull time-based sample data. The generator anchors on a fixed start
  // timestamp and grows the numbers over a 7-day window — swap this out for
  // real services (Twilio + GHL + Cal.com) once they're wired up.
  const {
    sends,
    upcomingMeetings,
    liveCampaigns,
    topScripts,
    topStates,
    totalSpent,
    costPerCallBooked,
  } = getDashboardSample();

  return (
    <section>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            SMS outreach at a glance — sends, replies, meetings booked, and
            who's converting best.
          </p>
        </div>
        <RefreshButton />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SendsPanel
          data={sends}
          totalSpent={totalSpent}
          costPerCallBooked={costPerCallBooked}
        />
        <UpcomingMeetingsPanel meetings={upcomingMeetings} />
        <LiveCampaignsPanel campaigns={liveCampaigns} className="lg:col-span-1" />
        <TopScriptsPanel scripts={topScripts} />
      </div>

      <TopStatesPanel states={topStates} className="mt-6" />
    </section>
  );
}

// ── panels ──────────────────────────────────────────────────────────────

function UpcomingMeetingsPanel({ meetings }: { meetings: UpcomingMeeting[] }) {
  return (
    <Panel
      title="Meetings booked"
      subtitle={meetings.length > 0 ? `${meetings.length} upcoming` : undefined}
      action={
        <Link
          href="/atlas/meetings"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          View all →
        </Link>
      }
    >
      {meetings.length === 0 ? (
        <PanelEmpty
          icon={<CalendarIcon />}
          title="No meetings booked yet"
          message="Booked meetings from inbound SMS replies will land here."
        />
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {meetings.slice(0, 5).map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {m.leadName}
                </div>
                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {m.leadState} · {m.campaignName}
                </div>
              </div>
              <div className="shrink-0 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {formatMeetingTime(m.startsAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LiveCampaignsPanel({
  campaigns,
  className,
}: {
  campaigns: Campaign[];
  className?: string;
}) {
  const live = campaigns.filter((c) => c.status === "running");
  return (
    <Panel
      title="Live campaigns"
      subtitle={live.length > 0 ? `${live.length} running` : undefined}
      className={className}
      action={
        <Link
          href="/atlas/campaigns"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Manage →
        </Link>
      }
    >
      {live.length === 0 ? (
        <PanelEmpty
          icon={<BroadcastIcon />}
          title="No live campaigns"
          message="Build one in the Campaigns tab to start sending."
          link={{ href: "/campaigns", label: "Go to Campaigns" }}
        />
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {live.map((c) => (
            <li key={c.id} className="px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {c.name}
                  </span>
                </div>
                <div className="shrink-0 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {c.sentToday} today
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100"
                  style={{ width: `${Math.round(c.progress * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TopScriptsPanel({ scripts }: { scripts: Template[] }) {
  return (
    <Panel
      title="Top scripts"
      subtitle="by reply rate"
      action={
        <Link
          href="/atlas/scripts"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Manage →
        </Link>
      }
    >
      {scripts.length === 0 ? (
        <PanelEmpty
          icon={<ChatIcon />}
          title="No scripts yet"
          message="Create a folder in the Scripts tab and add a template to see rankings here."
          link={{ href: "/scripts", label: "Go to Scripts" }}
        />
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {scripts.slice(0, 5).map((t, i) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex items-center gap-3 truncate">
                <span className="w-4 text-right font-mono text-xs text-zinc-400">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-zinc-900 dark:text-zinc-100">
                    {t.id}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-500">
                    {t.sent.toLocaleString()} sent
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {pct(t.replyRate)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TopStatesPanel({
  states,
  className,
}: {
  states: StatePerf[];
  className?: string;
}) {
  return (
    <Panel
      title="Top performing states"
      subtitle="reply rate + meetings booked"
      className={className}
    >
      {states.length === 0 ? (
        <PanelEmpty
          icon={<MapIcon />}
          title="Not enough data yet"
          message="State-level breakdowns appear once at least one campaign has been running."
        />
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {states.slice(0, 8).map((s) => (
            <li
              key={s.state}
              className="grid grid-cols-[3rem_1fr_auto_auto_auto] items-center gap-4 px-5 py-3"
            >
              <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {s.state}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100"
                  style={{ width: `${Math.min(100, Math.round(s.replyRate * 100 * 10))}%` }}
                />
              </div>
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {s.sent.toLocaleString()} sent
              </span>
              <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                {pct(s.replyRate)} reply
              </span>
              <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {s.meetings} meetings
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ── shared primitives ────────────────────────────────────────────────────

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
    >
      <div className="border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <div className="flex items-baseline gap-3">
            {subtitle && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-500">
                {subtitle}
              </span>
            )}
            {action}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function PanelEmpty({
  icon,
  title,
  message,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
        {icon}
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </p>
      <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
        {message}
      </p>
      {link && (
        <Link
          href={link.href}
          className="mt-3 inline-flex h-7 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}

// ── icons ────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-zinc-400 dark:text-zinc-500"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-zinc-400 dark:text-zinc-500"
      aria-hidden="true"
    >
      <path d="M4.93 19.07a10 10 0 0 1 0-14.14M19.07 4.93a10 10 0 0 1 0 14.14M7.76 16.24a6 6 0 0 1 0-8.48M16.24 7.76a6 6 0 0 1 0 8.48" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-zinc-400 dark:text-zinc-500"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-zinc-400 dark:text-zinc-500"
      aria-hidden="true"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatMeetingTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
