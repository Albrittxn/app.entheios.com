"use client";

// Expanded panel below each call row. Two halves:
//   LEFT  — read-only context grouped into Contact / Lead / Pipeline / Words
//   RIGHT — closer-editable form (Status, Objections, Follow-up, Notes)
//
// Each left group only renders if it has data, so quick-form leads
// (Contact + Lead only) look intentional and inbound leads (Contact + Lead +
// Pipeline + Words) feel rich.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, LeadObjection, LeadSource, LeadStatus } from "@/lib/closing-leads";
import { LEAD_OBJECTIONS, LEAD_STATUSES, formatMeetingTime } from "@/lib/closing-leads";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

export function LeadDetail({ lead }: { lead: Lead }) {
  const showPipeline =
    !!lead.annualClosings || !!lead.avgSalePrice || !!lead.bottleneck;

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:divide-x lg:divide-zinc-200 dark:lg:divide-zinc-800">
      {/* LEFT — read-only context, definition-list style */}
      <div className="space-y-4 text-sm">
        <SourceBadge source={lead.source} bookedAt={lead.createdAt ?? lead.updatedAt} />
        <DetailList lead={lead} showPipeline={showPipeline} />
        <MediaRow lead={lead} />
        <ProspectNotes source={lead.source} text={lead.bookerMessage} />
      </div>

      {/* RIGHT — closer-editable form */}
      <div className="lg:pl-5">
        <CloserForm lead={lead} />
      </div>
    </div>
  );
}

function SourceBadge({ source, bookedAt }: { source: LeadSource; bookedAt?: string }) {
  const isInbound = source === "inbound";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
        {isInbound ? "Inbound lead" : "Outbound lead"}
      </span>
      {bookedAt && <BookedAt iso={bookedAt} />}
    </div>
  );
}

function BookedAt({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    setLabel(
      d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }, [iso]);
  return (
    <span className="text-[11px] text-zinc-500 dark:text-zinc-500" suppressHydrationWarning>
      {label ? `Booked ${label}` : ""}
    </span>
  );
}

function ProspectNotes({ source, text }: { source: LeadSource; text?: string }) {
  const label = source === "inbound" ? "Prospect notes" : "Outreach notes";
  return (
    <div className="space-y-2 pt-1">
      <div className="text-xs text-zinc-500 dark:text-zinc-500">{label}</div>
      {text ? (
        <blockquote className="border-l-2 border-zinc-300 bg-zinc-50/60 px-3 py-2 text-sm italic leading-relaxed text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
          “{text}”
        </blockquote>
      ) : null}
    </div>
  );
}

function DetailList({
  lead,
  showPipeline,
}: {
  lead: Lead;
  showPipeline: boolean;
}) {
  const rows: Array<{ label: string; value: React.ReactNode; group?: "contact" | "lead" | "pipeline" }> = [];

  if (lead.phone) rows.push({ label: "Phone", value: <CopyableValue value={lead.phone} />, group: "contact" });
  if (lead.email) rows.push({ label: "Email", value: <CopyableValue value={lead.email} breakAll />, group: "contact" });
  if (lead.website)
    rows.push({
      label: "Website",
      value: (
        <a
          href={lead.website}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          {lead.website.replace(/^https?:\/\//, "")}
        </a>
      ),
      group: "contact",
    });

  rows.push({ label: "Meeting", value: <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatMeetingTime(lead.meetingTimeIso)}</span>, group: "lead" });
  if (lead.brokerage) rows.push({ label: "Brokerage", value: <span className="font-medium text-zinc-900 dark:text-zinc-100">{lead.brokerage}</span>, group: "lead" });
  if (lead.market) rows.push({ label: lead.source === "inbound" ? "Market" : "State", value: <span className="font-medium text-zinc-900 dark:text-zinc-100">{lead.market}</span>, group: "lead" });

  if (showPipeline) {
    if (lead.annualClosings) rows.push({ label: "Closings (12mo)", value: <span className="font-medium text-zinc-900 dark:text-zinc-100">{lead.annualClosings}</span>, group: "pipeline" });
    if (lead.avgSalePrice) rows.push({ label: "Avg sale price", value: <span className="font-medium text-zinc-900 dark:text-zinc-100">{lead.avgSalePrice}</span>, group: "pipeline" });
    if (lead.bottleneck) rows.push({ label: "Bottleneck", value: <span className="text-zinc-800 dark:text-zinc-200">{lead.bottleneck}</span>, group: "pipeline" });
  }

  return (
    <dl className="space-y-1.5">
      {rows.map((r, i) => {
        const prev = rows[i - 1];
        const showGap = prev && prev.group !== r.group;
        return (
          <div
            key={r.label}
            className={cn(
              "grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-3",
              showGap && "pt-3",
            )}
          >
            <dt className="text-xs text-zinc-500 dark:text-zinc-500">{r.label}</dt>
            <dd className="min-w-0">{r.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function CopyableValue({ value, breakAll }: { value: string; breakAll?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={cn(
          "font-medium text-zinc-900 dark:text-zinc-100",
          breakAll && "break-all",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        title={copied ? "Copied" : "Copy"}
        aria-label="Copy"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        {copied ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>
    </span>
  );
}

function MediaRow({ lead }: { lead: Lead }) {
  return (
    <div className="flex gap-2 pt-2">
      <MediaChip label="Recording" href={lead.recordingUrl} lead={lead} />
      <MediaChip label="Transcript" href={lead.transcriptUrl} lead={lead} />
    </div>
  );
}

function MediaChip({
  label,
  href,
  lead,
}: {
  label: string;
  href?: string | null;
  lead: Lead;
}) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
      >
        {label} ↗
      </a>
    );
  }
  const future = new Date(lead.meetingTimeIso) > new Date();
  const tooltip = future
    ? `${label} will appear here automatically once the call has taken place.`
    : `${label} usually lands here within ~10 minutes of the call ending — it auto-populates from Cal.com.`;
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex items-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-600">
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {tooltip}
      </span>
    </span>
  );
}

// ── right-side editable form ───────────────────────────────────────────

function CloserForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const { show } = useToast();
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [objections, setObjections] = useState<LeadObjection[]>(lead.objections);
  const [followUpDate, setFollowUpDate] = useState(lead.followUpDate ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);

  const initialObjectionsKey = [...lead.objections].sort().join("|");
  const currentObjectionsKey = [...objections].sort().join("|");
  const dirty =
    status !== lead.status ||
    currentObjectionsKey !== initialObjectionsKey ||
    followUpDate !== (lead.followUpDate ?? "") ||
    notes !== (lead.notes ?? "");

  function toggleObjection(o: LeadObjection) {
    setObjections((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o],
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/closing/leads/${encodeURIComponent(lead.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status, objections, followUpDate, notes }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Save failed (${res.status})`);
      }
      show("Saved");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Objections
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {LEAD_OBJECTIONS.map((o) => {
            const on = objections.includes(o);
            return (
              <label
                key={o}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
                  on
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleObjection(o)}
                  className="sr-only"
                />
                {o}
              </label>
            );
          })}
        </div>
      </div>

      {status === "Follow-Up Requested" && (
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Follow-up date
          </label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Post-call notes — what they want, what they're worried about, next step…"
          className="w-full resize-y rounded-md border border-zinc-300 bg-white p-2.5 text-sm leading-relaxed text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {dirty && !saving && (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-500">Unsaved changes</span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className={cn(
            "inline-flex h-9 items-center rounded-md px-4 text-xs font-semibold",
            "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
            "disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600",
          )}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
