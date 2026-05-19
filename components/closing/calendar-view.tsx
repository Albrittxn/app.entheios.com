"use client";

// Ported 1:1 from the closers-portal at teams.entheios.com.
// Only field rename: lead.meetingTime → lead.meetingTimeIso (our schema).

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/closing-leads";

type CalView = "month" | "week" | "day";

function parseLeadDate(iso: string): Date {
  const s = iso.includes("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z";
  return new Date(s);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const STATUS_DOT: Record<string, string> = {
  Booked: "bg-blue-500",
  Closed: "bg-emerald-500",
  "No Close": "bg-rose-500",
  "No-Show": "bg-rose-400",
  Cancelled: "bg-zinc-400",
  Nurture: "bg-violet-500",
  "Follow-Up Requested": "bg-amber-400",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];
  for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month, -i));
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length < 42) days.push(new Date(year, month + 1, days.length - firstDay - daysInMonth + 1));
  return days;
}

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function LeadPill({ lead, onClick }: { lead: Lead; onClick?: () => void }) {
  const dot = STATUS_DOT[lead.status] ?? "bg-zinc-400";
  const time = lead.meetingTimeIso
    ? parseLeadDate(lead.meetingTimeIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">{lead.name || "Unnamed"}</span>
      {time && <span className="ml-auto shrink-0 text-zinc-500">{time}</span>}
    </button>
  );
}

export function CalendarView({ leads, onLeadClick }: { leads: Lead[]; onLeadClick?: (lead: Lead) => void }) {
  const [view, setView] = useState<CalView>("month");
  const [current, setCurrent] = useState(() => new Date());
  const today = new Date();

  const leadsByDay = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const lead of leads) {
      if (!lead.meetingTimeIso) continue;
      const d = parseLeadDate(lead.meetingTimeIso);
      const key = dateKey(d);
      const arr = map.get(key) ?? [];
      arr.push(lead);
      map.set(key, arr);
    }
    return map;
  }, [leads]);

  function prev() {
    const d = new Date(current);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrent(d);
  }

  function next() {
    const d = new Date(current);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrent(d);
  }

  function goDay(d: Date) {
    setCurrent(d);
    setView("day");
  }

  let headerLabel = "";
  if (view === "month") {
    headerLabel = `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
  } else if (view === "week") {
    const days = getWeekDays(current);
    const first = days[0], last = days[6];
    headerLabel = first.getMonth() === last.getMonth()
      ? `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`
      : `${MONTH_NAMES[first.getMonth()]} – ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`;
  } else {
    headerLabel = current.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prev}
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Previous"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Next"
          >
            <ChevronRight />
          </button>
        </div>

        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{headerLabel}</h3>

        <button
          type="button"
          onClick={() => setCurrent(new Date())}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Today
        </button>

        <div className="ml-auto flex rounded-md border border-zinc-200 dark:border-zinc-700">
          {(["day","week","month"] as CalView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                view === v
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
            {DAY_SHORT.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getMonthGrid(current.getFullYear(), current.getMonth()).map((day, i) => {
              const isCurrentMonth = day.getMonth() === current.getMonth();
              const isToday = sameDay(day, today);
              const dayLeads = leadsByDay.get(dateKey(day)) ?? [];
              const visible = dayLeads.slice(0, 2);
              const overflow = dayLeads.length - visible.length;
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[96px] border-b border-r border-zinc-100 p-1.5 dark:border-zinc-800/60",
                    !isCurrentMonth && "bg-zinc-50/50 dark:bg-zinc-950/50",
                    i % 7 === 6 && "border-r-0",
                    i >= 35 && "border-b-0",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => goDay(day)}
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                      isToday
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : isCurrentMonth
                        ? "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        : "text-zinc-400 hover:bg-zinc-100 dark:text-zinc-600 dark:hover:bg-zinc-800",
                    )}
                  >
                    {day.getDate()}
                  </button>
                  <div className="space-y-0.5">
                    {visible.map((lead) => (
                      <LeadPill key={lead.id} lead={lead} onClick={() => onLeadClick ? onLeadClick(lead) : goDay(day)} />
                    ))}
                    {overflow > 0 && (
                      <button
                        type="button"
                        onClick={() => goDay(day)}
                        className="w-full px-1.5 text-left text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        +{overflow} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-7 divide-x divide-zinc-200 dark:divide-zinc-800">
            {getWeekDays(current).map((day) => {
              const isToday = sameDay(day, today);
              const dayLeads = leadsByDay.get(dateKey(day)) ?? [];
              return (
                <div key={day.toISOString()}>
                  <div className={cn(
                    "border-b border-zinc-200 px-2 py-2.5 text-center dark:border-zinc-800",
                    isToday && "bg-zinc-50 dark:bg-zinc-900/60",
                  )}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {DAY_SHORT[day.getDay()]}
                    </div>
                    <button
                      type="button"
                      onClick={() => goDay(day)}
                      className={cn(
                        "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        isToday
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                      )}
                    >
                      {day.getDate()}
                    </button>
                  </div>
                  <div className="min-h-[120px] space-y-1 p-1.5">
                    {dayLeads.map((lead) => {
                      const dot = STATUS_DOT[lead.status] ?? "bg-zinc-400";
                      const time = lead.meetingTimeIso
                        ? parseLeadDate(lead.meetingTimeIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                        : "";
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => onLeadClick?.(lead)}
                          className="w-full rounded-md border border-zinc-100 bg-white p-1.5 text-left transition-colors hover:border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          <div className="flex items-center gap-1">
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                            <span className="truncate text-[11px] font-medium text-zinc-800 dark:text-zinc-200">{lead.name || "Unnamed"}</span>
                          </div>
                          {time && <div className="mt-0.5 text-[10px] text-zinc-500">{time}</div>}
                        </button>
                      );
                    })}
                    {dayLeads.length === 0 && (
                      <div className="flex h-full min-h-[80px] items-center justify-center">
                        <span className="text-[11px] text-zinc-300 dark:text-zinc-700">—</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "day" && (() => {
        const dayLeads = (leadsByDay.get(dateKey(current)) ?? []).sort((a, b) => {
          if (!a.meetingTimeIso) return 1;
          if (!b.meetingTimeIso) return -1;
          return parseLeadDate(a.meetingTimeIso).getTime() - parseLeadDate(b.meetingTimeIso).getTime();
        });
        return dayLeads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            No calls on this day.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {dayLeads.map((lead) => {
              const dot = STATUS_DOT[lead.status] ?? "bg-zinc-400";
              const time = lead.meetingTimeIso
                ? parseLeadDate(lead.meetingTimeIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })
                : "";
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onLeadClick?.(lead)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 first:rounded-t-xl last:rounded-b-xl"
                >
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{lead.name || "Unnamed"}</div>
                    {lead.brokerage && (
                      <div className="text-sm text-zinc-500">{lead.brokerage}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{time}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{lead.status}</div>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
