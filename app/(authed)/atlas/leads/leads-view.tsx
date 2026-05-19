"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  matchColumns,
  parseDelimitedText,
  parseSheet,
  REQUIRED_COLUMNS,
  type ColumnMap,
} from "@/lib/csv";
import {
  formatBrokerage,
  formatEmail,
  formatName,
  formatPhone,
  formatState,
} from "@/lib/format";
import { useLocalState } from "@/lib/local-store";
import type { Lead, LeadGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

type PendingUpload = {
  name: string;
  rowCount: number;
  headers: string[];
  rows: string[][];
  map: ColumnMap;
  missing: string[];
};

type SortKey = "name" | "phone" | "email" | "brokerage" | "state" | "addedAt";
type SortDir = "asc" | "desc";

// Group filter values:
//   ""            → all leads (no filter)
//   "__ungrouped" → leads with no group assignments
//   "<id>"        → leads in that specific group
const UNGROUPED = "__ungrouped";

// A batch from the Leads hub batches store, as returned by
// GET /api/sales/batches. Only the fields the picker needs.
type BatchSummary = {
  id: string;
  name: string;
  lead_count: number;
  created_at: number;
};

export function LeadsView() {
  const toast = useToast();
  // Clean slate — leads start empty and fill in via CSV import. The "-v3"
  // suffix supersedes any previously-cached demo dataset.
  const [leads, setLeads] = useLocalState<Lead[]>("leads-v3", []);
  const [groups, setGroups] = useLocalState<LeadGroup[]>("groups-v2", []);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Batches from the Leads hub — pull a saved batch straight into the import
  // pipeline instead of re-uploading a file.
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [importingBatchId, setImportingBatchId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [brokerageFilter, setBrokerageFilter] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("addedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // Row selection — Set of lead IDs the user has ticked. Drives the bulk
  // action bar.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Bulk "add to group" dropdown.
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkNewGroupName, setBulkNewGroupName] = useState("");
  // Per-import "assign to group" picker.
  const [importGroupId, setImportGroupId] = useState<string>("");
  const [importNewGroupName, setImportNewGroupName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Close the bulk action menu if you click outside it.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!bulkMenuOpen) return;
      if (bulkMenuRef.current?.contains(e.target as Node)) return;
      setBulkMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [bulkMenuOpen]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let ungrouped = 0;
    for (const l of leads) {
      const ids = l.groupIds ?? [];
      if (ids.length === 0) ungrouped++;
      else for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return { byId: counts, ungrouped };
  }, [leads]);

  const uniqueStates = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => l.state).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [leads],
  );

  const uniqueBrokerages = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => l.brokerage).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [leads],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stateFilter && l.state !== stateFilter) return false;
      if (brokerageFilter && l.brokerage !== brokerageFilter) return false;
      const ids = l.groupIds ?? [];
      if (groupFilter === UNGROUPED && ids.length > 0) return false;
      if (groupFilter && groupFilter !== UNGROUPED && !ids.includes(groupFilter))
        return false;
      if (!q) return true;
      return [l.firstName, l.lastName, l.email, l.phone, l.brokerage, l.state]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [leads, search, stateFilter, brokerageFilter, groupFilter]);

  const sortedFiltered = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let av: string;
      let bv: string;
      switch (sortKey) {
        case "name":
          av = `${a.firstName} ${a.lastName}`.toLowerCase();
          bv = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "phone":
          av = a.phone;
          bv = b.phone;
          break;
        case "email":
          av = a.email.toLowerCase();
          bv = b.email.toLowerCase();
          break;
        case "brokerage":
          av = a.brokerage.toLowerCase();
          bv = b.brokerage.toLowerCase();
          break;
        case "state":
          av = a.state.toUpperCase();
          bv = b.state.toUpperCase();
          break;
        case "addedAt":
          av = a.addedAt;
          bv = b.addedAt;
          break;
      }
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const filtersActive =
    Boolean(search.trim()) ||
    Boolean(stateFilter) ||
    Boolean(brokerageFilter) ||
    Boolean(groupFilter);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "addedAt" ? "desc" : "asc");
    }
  }

  function clearFilters() {
    setSearch("");
    setStateFilter("");
    setBrokerageFilter("");
    setGroupFilter("");
  }

  // Cap how many rows we actually render so the DOM stays responsive even
  // when the master list is 30k+ leads. Users narrow via filters/search; the
  // "showing X of Y" footer makes the cap explicit.
  const RENDER_CAP = 300;
  const renderedLeads = useMemo(
    () => sortedFiltered.slice(0, RENDER_CAP),
    [sortedFiltered],
  );
  const renderedCapped = sortedFiltered.length > RENDER_CAP;

  // ── Selection helpers ────────────────────────────────────────────────
  // Selection still operates on the full filtered set, so "select all visible"
  // selects everything matching the current filters (not just rendered rows).
  const visibleIds = useMemo(
    () => sortedFiltered.map((l) => l.id),
    [sortedFiltered],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.has(id));

  // The "select all" checkbox needs an indeterminate state when some — but
  // not all — visible rows are ticked. That's only settable via the DOM
  // property, so reach for the ref.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // ── Bulk group actions ───────────────────────────────────────────────
  function applyGroupToSelected(groupId: string) {
    if (selected.size === 0) return;
    setLeads((prev) =>
      prev.map((l) => {
        if (!selected.has(l.id)) return l;
        const existing = l.groupIds ?? [];
        if (existing.includes(groupId)) return l;
        return { ...l, groupIds: [...existing, groupId] };
      }),
    );
    setBulkMenuOpen(false);
  }

  // Returns the group (creating it if the name is new). Used by both the
  // bulk action bar and the import preview.
  function getOrCreateGroup(rawName: string): LeadGroup | null {
    const name = rawName.trim();
    if (!name) return null;
    const existing = groups.find(
      (g) => g.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;
    const group: LeadGroup = {
      id: `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      createdAt: new Date().toISOString(),
    };
    setGroups((prev) => [...prev, group]);
    return group;
  }

  function createGroupAndApplyToSelected() {
    const group = getOrCreateGroup(bulkNewGroupName);
    if (!group) return;
    applyGroupToSelected(group.id);
    setBulkNewGroupName("");
  }

  function bulkRemove() {
    if (selected.size === 0) return;
    const toRestore = leads.filter((l) => selected.has(l.id));
    const count = toRestore.length;
    setLeads((prev) => prev.filter((l) => !selected.has(l.id)));
    setSelected(new Set());
    toast.show(`Removed ${count} ${count === 1 ? "lead" : "leads"}`, {
      undo: () => setLeads((prev) => [...toRestore, ...prev]),
    });
  }

  function removeFromGroup(leadId: string, groupId: string) {
    const lead = leads.find((l) => l.id === leadId);
    const group = groups.find((g) => g.id === groupId);
    if (!lead || !group) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, groupIds: (l.groupIds ?? []).filter((g) => g !== groupId) }
          : l,
      ),
    );
    toast.show(
      `Removed ${lead.firstName} ${lead.lastName} from "${group.name}"`,
      {
        undo: () =>
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    groupIds: Array.from(
                      new Set([...(l.groupIds ?? []), groupId]),
                    ),
                  }
                : l,
            ),
          ),
      },
    );
  }

  function deleteGroup(groupId: string) {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;
    // Snapshot the leads that were tagged with this group so undo can
    // restore both the group and every membership.
    const affectedLeadIds = leads
      .filter((l) => (l.groupIds ?? []).includes(groupId))
      .map((l) => l.id);
    setGroups((prev) => prev.filter((x) => x.id !== groupId));
    setLeads((prev) =>
      prev.map((l) => ({
        ...l,
        groupIds: (l.groupIds ?? []).filter((id) => id !== groupId),
      })),
    );
    const wasFilter = groupFilter === groupId;
    if (wasFilter) setGroupFilter("");
    toast.show(`Deleted group "${g.name}"`, {
      undo: () => {
        setGroups((prev) => [...prev, g]);
        const ids = new Set(affectedLeadIds);
        setLeads((prev) =>
          prev.map((l) =>
            ids.has(l.id)
              ? {
                  ...l,
                  groupIds: Array.from(
                    new Set([...(l.groupIds ?? []), groupId]),
                  ),
                }
              : l,
          ),
        );
        if (wasFilter) setGroupFilter(groupId);
      },
    });
  }

  async function handleFile(file: File) {
    setParseError(null);
    setParsing(true);
    try {
      const { headers, rows, rowCount } = await parseSheet(file);
      const { map, missing } = matchColumns(headers);
      setPending({ name: file.name, rowCount, headers, rows, map, missing });
    } catch (err) {
      setParseError(
        (err as Error).message ?? "Couldn't read that file. CSV or XLSX only.",
      );
    } finally {
      setParsing(false);
    }
  }

  // Parses raw clipboard text — handles both comma-separated (CSV) and
  // tab-separated (what you get when copying from Excel or Google Sheets).
  function handleText(text: string, sourceName: string) {
    setParseError(null);
    const trimmed = text.trim();
    if (!trimmed) return;
    setParsing(true);
    try {
      const { headers, rows, rowCount } = parseDelimitedText(trimmed);
      const { map, missing } = matchColumns(headers);
      setPending({ name: sourceName, rowCount, headers, rows, map, missing });
    } catch (err) {
      setParseError(
        (err as Error).message ?? "Couldn't read pasted data. Use comma- or tab-separated rows with a header line.",
      );
    } finally {
      setParsing(false);
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }
  function onPasteZone(e: ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData?.getData("text/plain") ?? "";
    if (!text.trim()) return;
    e.preventDefault();
    handleText(text, "Pasted data");
  }

  // Document-level paste — if the user copies a sheet anywhere and just hits
  // Cmd/Ctrl+V on the Leads page (without first clicking the drop zone), we
  // still catch it. We ignore paste events that originate from real form
  // fields so search / filter inputs work normally.
  useEffect(() => {
    function onDocPaste(ev: Event) {
      const e = ev as unknown as { target: EventTarget | null; clipboardData?: DataTransfer; preventDefault: () => void };
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      e.preventDefault();
      handleText(text, "Pasted data");
    }
    document.addEventListener("paste", onDocPaste);
    return () => document.removeEventListener("paste", onDocPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the Leads hub batch list once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sales/batches", {
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error("Couldn't load batches.");
        const data = (await res.json()) as { batches?: BatchSummary[] };
        if (!cancelled) setBatches(data.batches ?? []);
      } catch (err) {
        if (!cancelled) {
          setBatchesError((err as Error).message ?? "Couldn't load batches.");
        }
      } finally {
        if (!cancelled) setBatchesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pull a batch's rows into the same pending-import pipeline a file or
  // paste uses — column matching, group assignment, "Add to leads".
  async function importBatch(batch: BatchSummary) {
    if (importingBatchId || parsing) return;
    setParseError(null);
    setImportingBatchId(batch.id);
    try {
      const res = await fetch(`/api/sales/batches/${batch.id}/csv`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Couldn't load that batch.");
      const csv = await res.text();
      handleText(csv, batch.name);
    } catch (err) {
      setParseError((err as Error).message ?? "Couldn't load that batch.");
    } finally {
      setImportingBatchId(null);
    }
  }

  function importLeads() {
    if (!pending || pending.missing.length > 0) return;
    const m = pending.map;
    const now = new Date().toISOString();
    // Dedup against the already-formatted phone numbers so a freshly-pasted
    // "5125550181" and an existing "(512) 555-0181" are recognized as the
    // same lead.
    const existing = new Set(leads.map((l) => l.phone));
    // Resolve the import-to-group choice. Either:
    //   - dropdown pick (importGroupId)
    //   - new group name typed in the import preview (importNewGroupName)
    //   - neither → leads come in ungrouped
    let importGroup: LeadGroup | null = null;
    if (importNewGroupName.trim()) {
      importGroup = getOrCreateGroup(importNewGroupName);
    } else if (importGroupId) {
      importGroup = groups.find((g) => g.id === importGroupId) ?? null;
    }
    const seedGroupIds = importGroup ? [importGroup.id] : [];
    const toAdd: Lead[] = [];
    for (const row of pending.rows) {
      const phone = formatPhone(cell(row, m.phone));
      if (!phone || existing.has(phone)) continue;
      existing.add(phone);
      toAdd.push({
        id: `ld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        firstName: formatName(cell(row, m.firstName)),
        lastName: formatName(cell(row, m.lastName)),
        email: formatEmail(cell(row, m.email)),
        phone,
        brokerage: formatBrokerage(cell(row, m.brokerage)),
        state: formatState(cell(row, m.state)),
        addedAt: now,
        groupIds: [...seedGroupIds],
      });
    }
    setLeads((prev) => [...toAdd, ...prev]);
    setPending(null);
    setImportGroupId("");
    setImportNewGroupName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearAll() {
    if (!leads.length) return;
    const snapshot = leads;
    setLeads([]);
    setSelected(new Set());
    toast.show(`Cleared ${snapshot.length} leads`, {
      undo: () => setLeads(snapshot),
      durationMs: 10_000,
    });
  }

  function removeLead(id: string) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.show(`Removed ${lead.firstName} ${lead.lastName}`, {
      undo: () => setLeads((prev) => [lead, ...prev]),
    });
  }

  return (
    <section>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Master database of real-estate agent leads. Upload a CSV or XLSX
            with the six required columns to populate the list.
          </p>
        </div>
        <span className="hidden font-mono text-xs text-zinc-500 dark:text-zinc-400 sm:inline">
          {leads.length.toLocaleString()} {leads.length === 1 ? "lead" : "leads"}
        </span>
      </header>

      <div className="space-y-8">
        {/* Upload */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Upload leads
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Pull in a batch from the Leads hub, or drop a CSV/XLSX, click to
              upload, or paste rows from a spreadsheet. Required columns:{" "}
              {REQUIRED_COLUMNS.map((c) => c.label).join(", ")}.
            </p>
          </div>

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Left — pull a saved batch from the Leads hub */}
              <div className="flex min-h-[140px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    Import from a batch
                  </span>
                  {!batchesLoading && !batchesError && batches.length > 0 && (
                    <span className="font-mono text-[10px] text-zinc-400">
                      {batches.length}
                    </span>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {batchesLoading ? (
                    <div className="px-3 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      Loading batches…
                    </div>
                  ) : batchesError ? (
                    <div className="px-3 py-8 text-center text-xs text-rose-700 dark:text-rose-400">
                      {batchesError}
                    </div>
                  ) : batches.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        No batches yet
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        Create batches in the Leads hub to pull them in here.
                      </div>
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {batches.map((b) => {
                        const busy = importingBatchId === b.id;
                        return (
                          <li key={b.id}>
                            <button
                              type="button"
                              onClick={() => importBatch(b)}
                              disabled={!!importingBatchId || parsing}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-950"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {b.name}
                                </span>
                                <span className="block font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {b.lead_count.toLocaleString()} leads ·{" "}
                                  {formatBatchDate(b.created_at)}
                                </span>
                              </span>
                              <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {busy ? "Loading…" : "Import"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right — drop, click, or paste */}
            <div
              tabIndex={0}
              role="button"
              aria-label="Upload or paste leads"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onPaste={onPasteZone}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileRef.current?.click();
                }
              }}
              className={cn(
                "flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
                "focus:outline-none focus-visible:border-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:border-zinc-100 dark:focus-visible:ring-zinc-500/50",
                dragOver
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                  : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onChange}
                className="sr-only"
              />
              {!pending && !parsing && (
                <>
                  <UploadIcon />
                  <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Drop, click, or paste leads
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    CSV, XLSX, or pasted rows · header line required ·{" "}
                    {REQUIRED_COLUMNS.length} columns to match
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                    ⌘ V to paste from clipboard
                  </div>
                </>
              )}
              {parsing && (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Parsing…
                </div>
              )}
              {pending && !parsing && (
                <div className="w-full">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-sm text-zinc-900 dark:text-zinc-100">
                        {pending.name}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {pending.rowCount.toLocaleString()} rows ·{" "}
                        {pending.missing.length === 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            all required columns matched
                          </span>
                        ) : (
                          <span className="text-rose-700 dark:text-rose-400">
                            missing: {pending.missing.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPending(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="text-xs font-medium text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>

            {parseError && (
              <p
                className="mt-3 text-sm text-rose-700 dark:text-rose-400"
                role="alert"
              >
                {parseError}
              </p>
            )}

            {pending && (
              <div className="mt-4">
                <ul className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">
                  {REQUIRED_COLUMNS.map((c) => {
                    const ok = pending.map[c.key] !== null;
                    return (
                      <li
                        key={c.key}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono",
                          ok
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
                        )}
                      >
                        {ok ? <CheckIcon /> : <XIcon />}
                        {c.label.toLowerCase()}
                      </li>
                    );
                  })}
                </ul>

                {/* Optional: assign every imported lead to a group on the
                    way in. Either pick an existing group or type a new name. */}
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    Add imported leads to a group{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      (optional)
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={importGroupId}
                      onChange={(e) => {
                        setImportGroupId(e.target.value);
                        if (e.target.value) setImportNewGroupName("");
                      }}
                      disabled={!!importNewGroupName.trim()}
                      className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                    >
                      <option value="">Don't assign</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                      or
                    </span>
                    <input
                      type="text"
                      placeholder="Create new group…"
                      value={importNewGroupName}
                      onChange={(e) => {
                        setImportNewGroupName(e.target.value);
                        if (e.target.value) setImportGroupId("");
                      }}
                      maxLength={48}
                      className="h-8 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {pending.missing.length === 0
                      ? `${pending.rowCount.toLocaleString()} leads ready to import`
                      : `Fix missing columns to import`}
                  </span>
                  <Button
                    type="button"
                    onClick={importLeads}
                    disabled={pending.missing.length > 0}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Add to leads
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Master list
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {leads.length === 0 ? (
                  "No leads yet"
                ) : filtersActive ? (
                  <>
                    Showing{" "}
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {sortedFiltered.length.toLocaleString()}
                    </span>{" "}
                    of {leads.length.toLocaleString()} · de-duplicated by phone
                  </>
                ) : (
                  `${leads.length.toLocaleString()} ${
                    leads.length === 1 ? "lead" : "leads"
                  } · de-duplicated by phone number`
                )}
              </p>
            </div>
            {leads.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
              >
                Clear all
              </button>
            )}
          </div>

          {leads.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
              <Input
                type="search"
                placeholder="Search name, phone, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56 border-zinc-300 bg-white text-xs focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-zinc-400"
              />
              <FilterSelect
                label="State"
                value={stateFilter}
                onChange={setStateFilter}
                options={uniqueStates}
                allLabel="All states"
              />
              <FilterSelect
                label="Brokerage"
                value={brokerageFilter}
                onChange={setBrokerageFilter}
                options={uniqueBrokerages}
                allLabel="All brokerages"
              />
              <GroupFilter
                value={groupFilter}
                onChange={setGroupFilter}
                groups={groups}
                counts={groupCounts}
                onDeleteGroup={deleteGroup}
              />
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Bulk action bar — appears when 1+ rows are selected. */}
          <AnimatePresence initial={false}>
            {selected.size > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-visible border-b border-zinc-200 bg-zinc-900 text-white dark:border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
              >
                <div className="flex flex-wrap items-center gap-2 px-6 py-2.5">
                  <span className="text-xs font-medium">
                    {selected.size} selected
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">·</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs font-medium text-zinc-300 hover:text-white dark:text-zinc-500 dark:hover:text-zinc-900"
                  >
                    Clear
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <div ref={bulkMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setBulkMenuOpen((o) => !o)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-white/30 bg-white/10 px-2.5 text-xs font-medium hover:bg-white/20 dark:border-zinc-900/30 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/20"
                        aria-expanded={bulkMenuOpen}
                        aria-haspopup="menu"
                      >
                        Add to group
                        <Chevron open={bulkMenuOpen} />
                      </button>
                      <AnimatePresence>
                        {bulkMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-md border border-zinc-200 bg-white text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                            role="menu"
                          >
                            <div className="border-b border-zinc-200 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                              Add {selected.size}{" "}
                              {selected.size === 1 ? "lead" : "leads"} to…
                            </div>
                            {groups.length > 0 && (
                              <ul className="max-h-44 overflow-y-auto">
                                {groups.map((g) => (
                                  <li key={g.id}>
                                    <button
                                      type="button"
                                      onClick={() => applyGroupToSelected(g.id)}
                                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                    >
                                      <span className="truncate">{g.name}</span>
                                      <span className="ml-2 font-mono text-[10px] text-zinc-400">
                                        {groupCounts.byId.get(g.id) ?? 0}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                createGroupAndApplyToSelected();
                              }}
                              className="flex items-center gap-1 border-t border-zinc-200 p-2 dark:border-zinc-800"
                            >
                              <input
                                type="text"
                                placeholder="New group name…"
                                value={bulkNewGroupName}
                                onChange={(e) =>
                                  setBulkNewGroupName(e.target.value)
                                }
                                maxLength={48}
                                className="h-7 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                              />
                              <button
                                type="submit"
                                disabled={!bulkNewGroupName.trim()}
                                className="h-7 rounded-md bg-zinc-900 px-2 text-[11px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                              >
                                Create
                              </button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      type="button"
                      onClick={bulkRemove}
                      className="inline-flex h-7 items-center rounded-md border border-rose-300/50 bg-rose-500/15 px-2.5 text-xs font-medium text-rose-100 hover:bg-rose-500/25 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-700 dark:hover:bg-rose-500/20"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {leads.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Upload a sheet above to populate the master database.
            </div>
          ) : sortedFiltered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No leads match the current filters.{" "}
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="w-8 px-3 py-2.5">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible leads"
                        className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400/40 dark:border-zinc-700"
                      />
                    </th>
                    <SortableHeader
                      label="Name"
                      sortKey="name"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <SortableHeader
                      label="Phone"
                      sortKey="phone"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <SortableHeader
                      label="Email"
                      sortKey="email"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <SortableHeader
                      label="Brokerage"
                      sortKey="brokerage"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <SortableHeader
                      label="State"
                      sortKey="state"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <SortableHeader
                      label="Added"
                      sortKey="addedAt"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wide">
                      Groups
                    </th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {renderedLeads.map((l) => {
                      const leadGroupIds = l.groupIds ?? [];
                      const isSelected = selected.has(l.id);
                      return (
                        <motion.tr
                          key={l.id}
                          layout
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "border-t border-zinc-200 dark:border-zinc-800",
                            isSelected &&
                              "bg-zinc-50 dark:bg-zinc-900/60",
                          )}
                        >
                          <td className="w-8 px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(l.id)}
                              aria-label={`Select ${l.firstName} ${l.lastName}`}
                              className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400/40 dark:border-zinc-700"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {l.firstName} {l.lastName}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                            {l.phone}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                            {l.email}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                            {l.brokerage}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs uppercase text-zinc-700 dark:text-zinc-300">
                            {l.state}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-500">
                            {formatAdded(l.addedAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {leadGroupIds.length === 0 ? (
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                                  —
                                </span>
                              ) : (
                                leadGroupIds.map((gid) => {
                                  const g = groups.find((x) => x.id === gid);
                                  if (!g) return null;
                                  return (
                                    <button
                                      key={gid}
                                      type="button"
                                      onClick={() => removeFromGroup(l.id, gid)}
                                      title={`Remove from "${g.name}"`}
                                      className="group inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-rose-100 hover:text-rose-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                                    >
                                      {g.name}
                                      <span
                                        aria-hidden="true"
                                        className="text-zinc-400 group-hover:text-rose-600 dark:text-zinc-500 dark:group-hover:text-rose-400"
                                      >
                                        ×
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeLead(l.id)}
                              className="text-xs font-medium text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                            >
                              Remove
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              {renderedCapped && (
                <div className="border-t border-zinc-200 px-6 py-3 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  Showing the first {RENDER_CAP.toLocaleString()} of{" "}
                  {sortedFiltered.length.toLocaleString()} matching leads.
                  Narrow with search, state, or brokerage filters to see more.
                </div>
              )}
            </div>
          )}

          <p className="border-t border-zinc-200 px-6 py-3 text-[11px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
            Uploads are local-only until a shared lead store is provisioned.
          </p>
        </div>
      </div>
    </section>
  );
}

function cell(row: string[], idx: number | null): string {
  if (idx === null || idx < 0) return "";
  return (row[idx] ?? "").trim();
}

function formatAdded(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function GroupFilter({
  value,
  onChange,
  groups,
  counts,
  onDeleteGroup,
}: {
  value: string;
  onChange: (next: string) => void;
  groups: LeadGroup[];
  counts: { byId: Map<string, number>; ungrouped: number };
  onDeleteGroup: (id: string) => void;
}) {
  const active = Boolean(value);
  return (
    <div className="flex items-center gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Group"
        className={cn(
          "h-8 rounded-md border bg-white px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:bg-zinc-900",
          active
            ? "border-zinc-900 text-zinc-900 dark:border-zinc-300 dark:text-zinc-100"
            : "border-zinc-300 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
        )}
      >
        <option value="">All groups</option>
        <option value={UNGROUPED}>Ungrouped ({counts.ungrouped})</option>
        {groups.length > 0 && (
          <optgroup label="Groups">
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({counts.byId.get(g.id) ?? 0})
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {active && value !== UNGROUPED && (
        <button
          type="button"
          onClick={() => onDeleteGroup(value)}
          title="Delete this group"
          className="text-[10px] font-medium text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
        >
          Delete
        </button>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "h-2.5 w-2.5 transition-transform",
        open && "rotate-180",
      )}
      aria-hidden="true"
    >
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  allLabel: string;
}) {
  const active = Boolean(value);
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 rounded-md border bg-white px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:bg-zinc-900",
          active
            ? "border-zinc-900 text-zinc-900 dark:border-zinc-300 dark:text-zinc-100"
            : "border-zinc-300 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
        )}
        disabled={options.length === 0}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const isActive = active === sortKey;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={cn(
          "group inline-flex items-center gap-1 uppercase tracking-wide focus:outline-none focus-visible:text-zinc-900 dark:focus-visible:text-zinc-100",
          isActive
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
        )}
        aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <SortGlyph isActive={isActive} dir={dir} />
      </button>
    </th>
  );
}

function SortGlyph({ isActive, dir }: { isActive: boolean; dir: SortDir }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "h-2.5 w-2.5 transition-[opacity,transform] duration-150",
        isActive ? "opacity-100" : "opacity-30 group-hover:opacity-60",
        isActive && dir === "desc" && "rotate-180",
      )}
      aria-hidden="true"
    >
      <path d="M3 8 L6 4 L9 8" />
    </svg>
  );
}

function formatBatchDate(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-zinc-400 dark:text-zinc-500"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 0 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 1 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4z"
        clipRule="evenodd"
      />
    </svg>
  );
}
