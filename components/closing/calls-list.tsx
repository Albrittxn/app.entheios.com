"use client";

// The Closing → Calls list. Click a row to expand inline with the lead
// detail panel + closer-editable form. Empty-by-default fields are simply
// not rendered, so quick-form leads look intentional rather than ghost-empty.

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  type Lead,
  type LeadStatus,
  formatMeetingTime,
} from "@/lib/closing-leads";
import { LeadDetail } from "@/components/closing/lead-detail";
import { CalendarView } from "@/components/closing/calendar-view";
import { cn } from "@/lib/utils";

const expandTransition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

export type CloserOption = { email: string; name: string; profilePictureUrl?: string };

type Tab = "upcoming" | "past" | "calendar";

export function CallsList({
  upcoming,
  past,
  closers,
  activeCloser,
  isAdmin,
  timezone,
}: {
  upcoming: Lead[];
  past: Lead[];
  closers?: CloserOption[];
  activeCloser?: string;
  isAdmin?: boolean;
  timezone?: string;
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const leads = tab === "upcoming" ? upcoming : tab === "past" ? past : [];
  const allLeads = [...upcoming, ...past];

  function handleCalendarLeadClick(lead: Lead) {
    const isUpcoming = upcoming.some((l) => l.id === lead.id);
    setTab(isUpcoming ? "upcoming" : "past");
    setPendingOpenId(lead.id);
  }

  return (
    <section className="space-y-4">
      {isAdmin && closers && closers.length > 0 && (
        <CloserFilterChips closers={closers} active={activeCloser ?? "all"} />
      )}

      <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center">
          {([
            { id: "upcoming" as const, label: "Upcoming meetings", count: upcoming.length },
            { id: "past" as const, label: "Past meetings", count: past.length },
          ]).map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40",
                  selected
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                    selected
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                  )}
                >
                  {t.count}
                </span>
                {selected && (
                  <motion.span
                    layoutId="closing-subtab-underline"
                    className="absolute inset-x-2 -bottom-px h-[2px] bg-zinc-900 dark:bg-zinc-100"
                    transition={{ type: "tween", duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setTab("calendar")}
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40",
              tab === "calendar"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
            )}
          >
            <CalendarIcon />
            Calendar View
            {tab === "calendar" && (
              <motion.span
                layoutId="closing-subtab-underline"
                className="absolute inset-x-2 -bottom-px h-[2px] bg-zinc-900 dark:bg-zinc-100"
                transition={{ type: "tween", duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </button>
        </div>
      </div>

      {tab === "calendar" ? (
        <CalendarView leads={allLeads} onLeadClick={handleCalendarLeadClick} />
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
          {tab === "upcoming" ? "No upcoming calls yet." : "No past calls yet."}
        </div>
      ) : (
        <CallsTable leads={leads} initialOpenId={pendingOpenId} timezone={timezone} isAdmin={isAdmin} />
      )}
    </section>
  );
}

function CloserFilterChips({
  closers,
  active,
}: {
  closers: CloserOption[];
  active: string;
}) {
  const options: Array<{ key: string; label: string; href: string; profilePictureUrl?: string }> = [
    { key: "all", label: "All closers", href: "/closing/calls" },
    ...closers.map((c) => ({
      key: c.email,
      label: c.name,
      href: `/closing/calls?closer=${encodeURIComponent(c.email)}`,
      profilePictureUrl: c.profilePictureUrl,
    })),
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const selected = active === o.key;
        return (
          <Link
            key={o.key}
            href={o.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selected
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-gold/40 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-gold/40 dark:hover:bg-zinc-800",
            )}
          >
            {o.profilePictureUrl ? (
              <img
                src={o.profilePictureUrl}
                alt={o.label}
                className="h-4.5 w-4.5 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
              />
            ) : o.key !== "all" ? (
              <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {o.label.charAt(0).toUpperCase()}
              </div>
            ) : null}
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function CallsTable({
  leads,
  initialOpenId,
  timezone,
  isAdmin,
}: {
  leads: Lead[];
  initialOpenId?: string | null;
  timezone?: string;
  isAdmin?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? null);
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
      {leads.map((lead) => {
        const isOpen = openId === lead.id;
        return (
          <li
            key={lead.id}
            className={cn(
              "transition-colors",
              isOpen
                ? "bg-zinc-50 dark:bg-zinc-900/80"
                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
            )}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : lead.id)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {lead.name || "Unnamed lead"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{formatMeetingTime(lead.meetingTimeIso, timezone)}</span>
                  {lead.rescheduled && (
                    <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-medium text-cyan-700 ring-1 ring-inset ring-cyan-300 dark:bg-cyan-400/15 dark:text-cyan-300 dark:ring-cyan-400/30">
                      Rescheduled
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <StatusChip value={lead.status} />
                {lead.meetingLink && (
                  <a
                    href={lead.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Open Meet
                  </a>
                )}
                <motion.span
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={expandTransition}
                  className="inline-flex text-zinc-500"
                  aria-hidden="true"
                >
                  <ChevronRight />
                </motion.span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.section
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={expandTransition}
                  className="overflow-hidden border-t border-zinc-200 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-950/40"
                >
                  <div className="px-4 py-5 sm:px-5 sm:py-6">
                    <LeadDetail lead={lead} timezone={timezone} isAdmin={isAdmin} />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

const STATUS_TONE: Record<LeadStatus, string> = {
  Booked:
    "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  Cancelled:
    "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  "No-Show":
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  Closed:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  "No Close":
    "border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
  "Follow-Up Requested":
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  Nurture:
    "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300",
};

export function StatusChip({ value }: { value: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        STATUS_TONE[value],
      )}
    >
      {value}
    </span>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
