"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// SMS conversation inbox — every thread across all campaigns, outbound sends
// and inbound replies in one place. Clean slate: no data yet. Threads will
// populate here once the Twilio + GHL pipeline is connected.

type ConversationStatus = "active" | "booked" | "opted_out";

type Message = {
  id: string;
  direction: "outbound" | "inbound";
  body: string;
  at: string;
};

type Conversation = {
  id: string;
  leadName: string;
  leadPhone: string;
  leadState: string;
  campaignName: string;
  status: ConversationStatus;
  lastMessageAt: string;
  unread: boolean;
  messages: Message[];
};

// Clean slate — wire this to the live message store when it exists.
const CONVERSATIONS: Conversation[] = [];

type Filter = "all" | "unread" | "booked" | "opted_out";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "booked", label: "Booked" },
  { id: "opted_out", label: "Opted out" },
];

const STATUS_LABEL: Record<ConversationStatus, string> = {
  active: "Active",
  booked: "Booked",
  opted_out: "Opted out",
};

const STATUS_DOT: Record<ConversationStatus, string> = {
  active: "bg-sky-500",
  booked: "bg-emerald-500",
  opted_out: "bg-zinc-400 dark:bg-zinc-600",
};

export function ConversationsView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONVERSATIONS.filter((c) => {
      if (filter === "unread" && !c.unread) return false;
      if (filter === "booked" && c.status !== "booked") return false;
      if (filter === "opted_out" && c.status !== "opted_out") return false;
      if (!q) return true;
      return (
        c.leadName.toLowerCase().includes(q) ||
        c.leadPhone.toLowerCase().includes(q) ||
        c.campaignName.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  const selected = filtered.find((c) => c.id === selectedId) ?? null;
  const total = CONVERSATIONS.length;

  return (
    <section>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Every SMS thread across your campaigns — outbound sends and inbound
            replies in one place.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          {total} {total === 1 ? "thread" : "threads"}
        </span>
      </header>

      <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-lg border border-zinc-200 bg-white md:grid-cols-[20rem_1fr] dark:border-zinc-800 dark:bg-zinc-950">
        {/* Conversation list */}
        <div className="flex min-h-0 flex-col border-b border-zinc-200 md:border-b-0 md:border-r dark:border-zinc-800">
          <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
            <Input
              type="search"
              placeholder="Search name, phone, campaign…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 bg-zinc-50 dark:bg-zinc-900"
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    filter === f.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
                  <ChatIcon />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {total === 0 ? "No conversations yet" : "No matches"}
                </p>
                <p className="mt-1 max-w-[15rem] text-xs text-zinc-500 dark:text-zinc-400">
                  {total === 0
                    ? "Threads appear here once your campaigns start sending."
                    : "Try a different search or filter."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                        selectedId === c.id
                          ? "bg-zinc-100 dark:bg-zinc-900"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 truncate">
                          {c.unread && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                          )}
                          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {c.leadName}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                          {formatRelative(c.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {c.campaignName}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              STATUS_DOT[c.status],
                            )}
                          />
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {STATUS_LABEL[c.status]}
                          </span>
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Thread pane */}
        <div className="flex min-h-0 flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {selected.leadName}
                  </div>
                  <div className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {selected.leadPhone} · {selected.leadState} ·{" "}
                    {selected.campaignName}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-900">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      STATUS_DOT[selected.status],
                    )}
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {STATUS_LABEL[selected.status]}
                  </span>
                </span>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col gap-1",
                      m.direction === "outbound" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                        m.direction === "outbound"
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100",
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {formatRelative(m.at)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
                <ChatIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {total === 0 ? "No conversations yet" : "Select a conversation"}
              </p>
              <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                {total === 0
                  ? "Once campaigns start sending, every SMS thread — outbound and inbound — shows up here in real time."
                  : "Pick a thread on the left to read the full message history."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4 text-zinc-400 dark:text-zinc-500", className)}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  );
}
