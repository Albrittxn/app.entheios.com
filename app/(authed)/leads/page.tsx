"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { broadcastLeadsHubUpdate, useLeadsHubSync } from "@/lib/leads-hub-sync";
import { cn } from "@/lib/utils";
import {
  parseSheet,
  parseDelimitedText,
  matchColumns,
  REQUIRED_COLUMNS,
  type ColumnMap,
} from "@/lib/csv";
import type { LeadsHubBatch, LeadsHubLead } from "@/lib/leads-hub-store";

type PendingUpload = {
  fileName: string;
  name: string;
  rowCount: number;
  headers: string[];
  rows: string[][];
  map: ColumnMap;
  missing: string[];
};

type SortKey = "name" | "phone" | "email" | "brokerage" | "state" | "addedAt";
type SortDir = "asc" | "desc";

export default function LeadsHubPage() {
  const toast = useToast();
  
  // Data State
  const [leads, setLeads] = useState<LeadsHubLead[]>([]);
  const [batches, setBatches] = useState<LeadsHubBatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Search & Filter State
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("addedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  
  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  const fileRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Fetch batches & leads
  async function loadData() {
    try {
      const [bRes, lRes] = await Promise.all([
        fetch("/api/leads-hub/batches", { credentials: "same-origin" }),
        fetch("/api/leads-hub/leads", { credentials: "same-origin" }),
      ]);
      if (bRes.ok && lRes.ok) {
        const bData = await bRes.json();
        const lData = await lRes.json();
        setBatches(bData.batches || []);
        setLeads(lData.leads || []);
      }
    } catch (err) {
      console.error("Failed to load Leads Hub data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useLeadsHubSync(() => {
    void loadData();
  });

  // File Upload Handlers
  async function handleFile(file: File) {
    setParseError(null);
    setParsing(true);
    try {
      const { headers, rows, rowCount } = await parseSheet(file);
      const { map, missing } = matchColumns(headers);
      
      // Default batch title: filename without extension
      const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
      
      setPending({
        fileName: file.name,
        name: defaultTitle,
        rowCount,
        headers,
        rows,
        map,
        missing,
      });
    } catch (err) {
      setParseError(
        (err as Error).message ?? "Couldn't read file. CSV or XLSX only.",
      );
    } finally {
      setParsing(false);
    }
  }

  function handlePasteText(text: string, sourceName: string) {
    setParseError(null);
    const trimmed = text.trim();
    if (!trimmed) return;
    setParsing(true);
    try {
      const { headers, rows, rowCount } = parseDelimitedText(trimmed);
      const { map, missing } = matchColumns(headers);
      
      setPending({
        fileName: sourceName,
        name: "Pasted Batch",
        rowCount,
        headers,
        rows,
        map,
        missing,
      });
    } catch (err) {
      setParseError(
        (err as Error).message ?? "Couldn't read pasted data. Use standard columns.",
      );
    } finally {
      setParsing(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function onPasteZone(e: React.ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData?.getData("text/plain") ?? "";
    if (text.trim()) {
      e.preventDefault();
      handlePasteText(text, "Clipboard Paste");
    }
  }

  // Global Paste Handler
  useEffect(() => {
    function onDocPaste(ev: Event) {
      const e = ev as unknown as ClipboardEvent;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text.trim()) {
        e.preventDefault();
        handlePasteText(text, "Clipboard Paste");
      }
    }
    document.addEventListener("paste", onDocPaste);
    return () => document.removeEventListener("paste", onDocPaste);
  }, []);

  // Submit Import Batch
  async function submitImport() {
    if (!pending || pending.missing.length > 0) return;
    setParsing(true);
    
    // Resolve column index mappings
    const m = pending.map;
    
    // Construct the structured JSON rows
    const leadsToImport = pending.rows.map((row) => {
      const cell = (idx: number | null) => (idx !== null && idx >= 0 ? (row[idx] ?? "").trim() : "");
      return {
        firstName: cell(m.firstName),
        lastName: cell(m.lastName),
        email: cell(m.email),
        phone: cell(m.phone),
        brokerage: cell(m.brokerage),
        state: cell(m.state),
      };
    });

    try {
      const res = await fetch("/api/leads-hub/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pending.name,
          fileName: pending.fileName,
          leads: leadsToImport,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to import leads");
      }

      toast.show(`Successfully imported ${leadsToImport.length} leads into "${pending.name}"`);
      setPending(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadData();
      broadcastLeadsHubUpdate();
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  // Delete Individual Lead
  async function handleDeleteLead(lead: LeadsHubLead) {
    try {
      const res = await fetch(`/api/leads-hub/leads/${lead.id}?batchId=${lead.batchId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Could not delete lead");

      // Optimistically update
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });

      toast.show(`Removed ${lead.firstName} ${lead.lastName}`, {
        undo: async () => {
          // POST back to restore
          const restoreRes = await fetch("/api/leads-hub/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lead),
          });
          if (restoreRes.ok) {
            toast.show(`Restored ${lead.firstName} ${lead.lastName}`);
            await loadData();
            broadcastLeadsHubUpdate();
          }
        },
      });
    } catch (err) {
      console.error(err);
      toast.show("Error deleting lead");
    }
  }

  // Bulk Delete
  async function handleBulkDelete() {
    if (selected.size === 0) return;
    const toDelete = leads.filter((l) => selected.has(l.id));
    
    try {
      // Delete synchronously or in parallel
      await Promise.all(
        toDelete.map((l) =>
          fetch(`/api/leads-hub/leads/${l.id}?batchId=${l.batchId}`, {
            method: "DELETE",
          }),
        ),
      );

      toast.show(`Removed ${toDelete.length} leads`);
      setSelected(new Set());
      await loadData();
      broadcastLeadsHubUpdate();
    } catch (err) {
      console.error(err);
      toast.show("Error deleting selected leads");
    }
  }

  // Filter and Search logic
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (batchFilter && l.batchId !== batchFilter) return false;
      if (!q) return true;
      return [
        l.firstName,
        l.lastName,
        l.email,
        l.phone,
        l.brokerage,
        l.state,
        l.batchName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [leads, search, batchFilter]);

  const sortedFiltered = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let av = "";
      let bv = "";
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

  // Capped Rendering
  const RENDER_CAP = 300;
  const renderedLeads = useMemo(() => sortedFiltered.slice(0, RENDER_CAP), [sortedFiltered]);
  const renderedCapped = sortedFiltered.length > RENDER_CAP;

  // Selection helpers
  const visibleIds = useMemo(() => sortedFiltered.map((l) => l.id), [sortedFiltered]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = !allVisibleSelected && visibleIds.some((id) => selected.has(id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  function toggleSelectAll() {
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

  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "addedAt" ? "desc" : "asc");
    }
  }

  // Date Uploaded relative formatting
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
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <section>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Master database of every imported lead. Upload CSV/XLSX files here, then organize them into batches and folders downstream.
          </p>
        </div>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {leads.length.toLocaleString()} {leads.length === 1 ? "lead" : "leads"}
        </span>
      </header>

      <div className="space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Upload leads
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                CSV/XLSX only. Paste clipboard rows here too.
              </p>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Leads only
            </div>
          </div>

          <div>
            <div
              tabIndex={0}
              role="button"
              aria-label="Upload leads zone"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onPaste={onPasteZone}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileRef.current?.click();
                }
              }}
              className={cn(
                "flex min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-4 text-center transition-all",
                "focus:outline-none focus-visible:border-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:border-zinc-100 dark:focus-visible:ring-zinc-500/50",
                dragOver
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                  : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:border-zinc-700",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onFileChange}
                className="sr-only"
              />
              {!pending && !parsing && (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-zinc-400 dark:text-zinc-500"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Drop, click, or paste leads
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    CSV or XLSX sheets · header row required
                  </div>
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                    ⌘ V to paste clipboard sheet rows
                  </div>
                </>
              )}
              {parsing && (
                <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Parsing and validating...
                </div>
              )}
              {pending && !parsing && (
                <div className="w-full text-left" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-1">
                        Verify Title & Columns
                      </div>
                      
                      {/* Batch title edit */}
                      <div className="mb-4">
                        <label htmlFor="batch-title" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          List Title / Batch Name
                        </label>
                        <Input
                          id="batch-title"
                          type="text"
                          value={pending.name}
                          onChange={(e) => setPending({ ...pending, name: e.target.value })}
                          className="h-8 max-w-md bg-white dark:bg-zinc-900 border-zinc-300 text-xs focus-visible:ring-zinc-900"
                          placeholder="e.g. Inbound Agent Leads May"
                          maxLength={80}
                        />
                      </div>

                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                        <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
                          {pending.rowCount.toLocaleString()}
                        </span>{" "}
                        valid rows parsed from <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{pending.fileName}</code>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPending(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    >
                      Clear Upload
                    </button>
                  </div>

                  {/* Required Columns Mapping Status */}
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                      Required Columns Mapping Checklist:
                    </div>
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {REQUIRED_COLUMNS.map((c) => {
                        const ok = pending.map[c.key] !== null;
                        return (
                          <li
                            key={c.key}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors",
                              ok
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300"
                                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-300",
                            )}
                          >
                            {ok ? (
                              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.8-11.2a1 1 0 00-1.4-1.4L9 8.6 7.6 7.2a1 1 0 00-1.4 1.4l2.1 2.1a1 1 0 001.4 0l3.5-3.5z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.7 7.3a1 1 0 00-1.4 1.4L8.6 10l-1.3 1.3a1 1 0 101.4 1.4L10 11.4l1.3 1.3a1 1 0 001.4-1.4L11.4 10l1.3-1.3a1 1 0 00-1.4-1.4L10 8.6 8.7 7.3z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="truncate">{c.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {pending.missing.length === 0
                        ? "Verification complete. Ready to import."
                        : `Missing required: ${pending.missing.join(", ")}`}
                    </span>
                    <Button
                      type="button"
                      onClick={submitImport}
                      disabled={pending.missing.length > 0 || !pending.name.trim()}
                      className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Add to Leads Database
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {parseError && (
              <p className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-400" role="alert">
                {parseError}
              </p>
            )}
          </div>
        </div>

        {/* Master List Dashboard */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Master leads list
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {leads.length === 0
                  ? "No leads available yet."
                  : `Showing ${sortedFiltered.length.toLocaleString()} matching of ${leads.length.toLocaleString()} total.`}
              </p>
            </div>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                Delete Selected ({selected.size})
              </button>
            )}
          </div>

          {leads.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
              <Input
                type="search"
                placeholder="Search leads, phone, state, list name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-64 border-zinc-300 bg-white text-xs focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
              
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                aria-label="Filter by Lead List"
                className="h-8 rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <option value="">All Lead Lists / Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.leadCount})
                  </option>
                ))}
              </select>

              {search || batchFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setBatchFilter("");
                  }}
                  className="ml-auto text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Clear Filters
                </button>
              ) : null}
            </div>
          )}

          {loading ? (
            <div className="px-6 py-12 text-center text-xs text-zinc-500">
              Loading master database...
            </div>
          ) : leads.length === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Your leads master database is currently empty. Upload a CSV/XLSX file above to get started.
            </div>
          ) : sortedFiltered.length === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No leads matched your search or filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider font-semibold text-zinc-500 border-b border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800">
                  <tr>
                    <th className="w-8 px-3 py-3">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400/40"
                        aria-label="Select all leads on page"
                      />
                    </th>
                    <SortHeader label="Name" sKey="name" active={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Phone" sKey="phone" active={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Email" sKey="email" active={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Brokerage" sKey="brokerage" active={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortHeader label="State" sKey="state" active={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Date Uploaded" sKey="addedAt" active={sortKey} dir={sortDir} onClick={toggleSort} />
                    <th className="px-4 py-3 font-medium">Source List</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <AnimatePresence initial={false}>
                    {renderedLeads.map((l) => {
                      const isSel = selected.has(l.id);
                      return (
                        <motion.tr
                          key={l.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors",
                            isSel && "bg-zinc-50 dark:bg-zinc-900/40"
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => toggleSelectOne(l.id)}
                              className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400/40"
                              aria-label={`Select lead ${l.firstName}`}
                            />
                          </td>
                          <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                            {l.firstName} {l.lastName}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">
                            {l.phone}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">
                            {l.email}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                            {l.brokerage || "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono uppercase text-zinc-700 dark:text-zinc-300">
                            {l.state || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                            {formatAdded(l.addedAt)}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">
                            {l.batchName}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(l)}
                              className="text-xs font-medium text-zinc-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-450 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Delete
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {renderedCapped && (
                <div className="border-t border-zinc-200 px-6 py-3 text-center text-xs text-zinc-500 dark:border-zinc-800">
                  Showing first {RENDER_CAP.toLocaleString()} of {sortedFiltered.length.toLocaleString()} matching leads. Use filters or search to narrow down list.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SortHeader({
  label,
  sKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const isAct = active === sKey;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onClick(sKey)}
        className={cn(
          "inline-flex items-center gap-1 group hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors uppercase text-[10px]",
          isAct ? "text-zinc-900 dark:text-zinc-100 font-bold" : "text-zinc-500 dark:text-zinc-400"
        )}
      >
        {label}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className={cn(
            "h-2.5 w-2.5 transition-transform duration-150",
            isAct ? "opacity-100" : "opacity-20 group-hover:opacity-60",
            isAct && dir === "desc" && "rotate-180"
          )}
        >
          <path d="M3 8 L6 4 L9 8" />
        </svg>
      </button>
    </th>
  );
}
