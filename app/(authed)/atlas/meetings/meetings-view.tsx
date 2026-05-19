"use client";

import { useState } from "react";
import Link from "next/link";
import type { UpcomingMeeting } from "@/lib/types";
import { cn } from "@/lib/utils";

// Full meetings list — every meeting booked from an inbound SMS reply, split
// into what's still ahead and what's already happened. Clean slate: no
// meetings yet. Wire these to the live Cal.com booking feed when it exists.

const UPCOMING: UpcomingMeeting[] = [];
const PAST: UpcomingMeeting[] = [];

type TabId = "upcoming" | "past";

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: "upcoming", label: "Upcoming", count: UPCOMING.length },
  { id: "past", label: "Past", count: PAST.length },
];

export function MeetingsView() {
  const [tab, setTab] = useState<TabId>("upcoming");
  const meetings = tab === "upcoming" ? UPCOMING : PAST;

  return (
    <section>
      <header className="mb-6">
        <Link
          href="/atlas/dashboard"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Every meeting booked from an inbound SMS reply.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Meetings"
        className="mb-5 inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded px-3 py-1.5 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50",
                active
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
              )}
            >
              {t.label}
              <span className="ml-1.5 font-mono text-xs text-zinc-400">
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
              <CalendarIcon />
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {tab === "upcoming" ? "No upcoming meetings" : "No past meetings"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              {tab === "upcoming"
                ? "Meetings booked from inbound SMS replies show up here as they come in."
                : "Once meetings happen, they move here for your records."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {m.leadName}
                  </div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {m.leadState} · {m.brokerage} · {m.campaignName}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {formatMeetingDate(m.startsAt)}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-400">
                    {formatMeetingTimeOnly(m.startsAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function formatMeetingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatMeetingTimeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-zinc-400 dark:text-zinc-500"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}
