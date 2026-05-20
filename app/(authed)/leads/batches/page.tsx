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

export default function LeadsBatchesPage() {
  const toast = useToast();
  
  // Data State
  const [batches, setBatches] = useState<LeadsHubBatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Active Batch Details Drawer State
  const [viewingBatch, setViewingBatch] = useState<LeadsHubBatch | null>(null);
  const [viewingLeads, setViewingLeads] = useState<LeadsHubLead[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch batches
  async function loadBatches() {
    try {
      const res = await fetch("/api/leads-hub/batches", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, []);

  useLeadsHubSync(() => {
    void loadBatches();
    if (viewingBatch) {
      void (async () => {
        const res = await fetch(`/api/leads-hub/leads?batchId=${viewingBatch.id}`);
        if (res.ok) {
          const data = await res.json();
          setViewingLeads(data.leads || []);
          setBatches((prev) =>
            prev.map((b) =>
              b.id === viewingBatch.id
                ? { ...b, leadCount: (data.leads || []).length }
                : b,
            ),
          );
        }
      })();
    }
  });

  // Open Drawer to inspect leads inside a batch
  async function handleViewLeads(batch: LeadsHubBatch) {
    setViewingBatch(batch);
    setDrawerLoading(true);
    setDrawerSearch("");
    try {
      const res = await fetch(`/api/leads-hub/leads?batchId=${batch.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingLeads(data.leads || []);
      }
    } catch (err) {
      console.error(err);
      toast.show("Failed to load batch leads");
    } finally {
      setDrawerLoading(false);
    }
  }

  // Delete batch with Undo capability
  async function handleDeleteBatch(batch: LeadsHubBatch) {
    try {
      // First fetch all leads in this batch to preserve them for possible Undo
      const leadsRes = await fetch(`/api/leads-hub/leads?batchId=${batch.id}`);
      let batchLeadsSnap: LeadsHubLead[] = [];
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        batchLeadsSnap = data.leads || [];
      }

      const res = await fetch(`/api/leads-hub/batches?id=${batch.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Could not delete batch");

      toast.show(`Deleted lead list "${batch.name}"`, {
        undo: async () => {
          // Restore batch by POSTing back all original leads & metadata
          const restoreRes = await fetch("/api/leads-hub/batches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: batch.id,
              name: batch.name,
              fileName: batch.fileName,
              uploadedAt: batch.uploadedAt,
              leads: batchLeadsSnap,
            }),
          });
          if (restoreRes.ok) {
            toast.show(`Restored lead list "${batch.name}"`);
            await loadBatches();
            broadcastLeadsHubUpdate();
          }
        },
      });

      await loadBatches();
      if (viewingBatch?.id === batch.id) {
        setViewingBatch(null);
      }
      broadcastLeadsHubUpdate();
    } catch (err) {
      console.error(err);
      toast.show("Error deleting batch");
    }
  }

  // Delete lead inside active drawer
  async function handleDeleteLeadInDrawer(lead: LeadsHubLead) {
    try {
      const res = await fetch(`/api/leads-hub/leads/${lead.id}?batchId=${lead.batchId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Could not delete lead");

      // Optimistically update local drawer state
      setViewingLeads((prev) => prev.filter((l) => l.id !== lead.id));
      
      // Update batch index lead count
      setBatches((prev) =>
        prev.map((b) => {
          if (b.id === lead.batchId) {
            return { ...b, leadCount: b.leadCount - 1 };
          }
          return b;
        })
      );
      broadcastLeadsHubUpdate();

      toast.show(`Removed ${lead.firstName} ${lead.lastName}`, {
        undo: async () => {
          const restoreRes = await fetch("/api/leads-hub/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lead),
          });
          if (restoreRes.ok) {
            // Restore drawer leads & list count
            setViewingLeads((prev) => [...prev, lead]);
            setBatches((prev) =>
              prev.map((b) => {
                if (b.id === lead.batchId) {
                  return { ...b, leadCount: b.leadCount + 1 };
                }
                return b;
              })
            );
            toast.show(`Restored ${lead.firstName} ${lead.lastName}`);
            broadcastLeadsHubUpdate();
          }
        },
      });
    } catch (err) {
      console.error(err);
      toast.show("Error deleting lead");
    }
  }

  // File Upload logic
  async function handleFile(file: File) {
    setParseError(null);
    setParsing(true);
    try {
      const { headers, rows, rowCount } = await parseSheet(file);
      const { map, missing } = matchColumns(headers);
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
      setParseError((err as Error).message ?? "Couldn't read file. CSV/XLSX only.");
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
      setParseError((err as Error).message ?? "Couldn't read pasted data.");
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

  // Submit Import
  async function submitImport() {
    if (!pending || pending.missing.length > 0) return;
    setParsing(true);
    
    const m = pending.map;
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

      toast.show(`Successfully created batch list "${pending.name}"`);
      setPending(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadBatches();
      broadcastLeadsHubUpdate();
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  // Local search inside active inspected batch
  const filteredDrawerLeads = useMemo(() => {
    const q = drawerSearch.trim().toLowerCase();
    if (!q) return viewingLeads;
    return viewingLeads.filter((l) =>
      [l.firstName, l.lastName, l.email, l.phone, l.brokerage, l.state]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [viewingLeads, drawerSearch]);

  // Date formatting helper
  function formatUploadedDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="relative">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Batches</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Carve and manage your agent lists. Review, upload, or remove distinct lead uploads.
          </p>
        </div>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {batches.length.toLocaleString()} {batches.length === 1 ? "list" : "lists"}
        </span>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Batches List & Upload */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upload card */}
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Upload new batch list
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Drop CSV or XLSX to create a distinct batch of leads.
              </p>
            </div>

            <div className="p-6">
              <div
                tabIndex={0}
                role="button"
                aria-label="Upload batch zone"
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
                  "flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-all",
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-zinc-400 dark:text-zinc-500">
                      <path d="M12 5v14m-7-7h14" />
                    </svg>
                    <div className="mt-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Add and verify a new list file
                    </div>
                  </>
                )}
                {parsing && (
                  <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Parsing sheet...
                  </div>
                )}
                {pending && !parsing && (
                  <div className="w-full text-left" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Import Verification
                      </span>
                      <button
                        type="button"
                        onClick={() => setPending(null)}
                        className="text-xs font-semibold text-rose-500"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label htmlFor="batch-name-input" className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Verify Batch / List Name
                        </label>
                        <Input
                          id="batch-name-input"
                          type="text"
                          value={pending.name}
                          onChange={(e) => setPending({ ...pending, name: e.target.value })}
                          className="h-8 text-xs bg-white dark:bg-zinc-900"
                          placeholder="Batch Title"
                        />
                      </div>

                      <div className="text-[11px] text-zinc-500">
                        Parsed <strong>{pending.rowCount.toLocaleString()}</strong> rows from <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{pending.fileName}</code>
                      </div>

                      {/* Header validation checklist */}
                      <div>
                        <span className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Mapped Columns:
                        </span>
                        <div className="grid grid-cols-3 gap-1 font-mono text-[9px]">
                          {REQUIRED_COLUMNS.map((c) => {
                            const ok = pending.map[c.key] !== null;
                            return (
                              <div
                                key={c.key}
                                className={cn(
                                  "flex items-center gap-1 border rounded px-1.5 py-0.5",
                                  ok ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20" : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/20"
                                )}
                              >
                                <span>{ok ? "✓" : "✗"}</span>
                                <span className="truncate">{c.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          onClick={submitImport}
                          disabled={pending.missing.length > 0 || !pending.name.trim()}
                          className="h-7 text-[11px] bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                        >
                          Confirm & Add List
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {parseError && <p className="mt-2 text-xs font-semibold text-rose-600">{parseError}</p>}
            </div>
          </div>

          {/* Batches index view */}
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              All Uploaded Batches
            </h2>

            {loading ? (
              <div className="text-xs text-zinc-500 text-center py-6">Loading list index...</div>
            ) : batches.length === 0 ? (
              <div className="text-xs text-zinc-500 text-center py-6">
                No uploaded batch lists yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <AnimatePresence initial={false}>
                  {batches.map((b) => {
                    const isViewing = viewingBatch?.id === b.id;
                    return (
                      <motion.div
                        key={b.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          "flex flex-col justify-between rounded-lg border p-4 transition-all bg-white dark:bg-zinc-950",
                          isViewing
                            ? "border-zinc-900 ring-1 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate block">
                              {b.name}
                            </span>
                            <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-700 dark:text-zinc-200 shrink-0">
                              {b.leadCount.toLocaleString()} leads
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block truncate mt-1">
                            File: {b.fileName}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                            Uploaded {formatUploadedDate(b.uploadedAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-900 pt-3 mt-4">
                          <button
                            type="button"
                            onClick={() => handleViewLeads(b)}
                            className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                          >
                            {isViewing ? "Inspecting" : "View Leads"}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(b)}
                            className="text-xs font-semibold text-zinc-400 hover:text-rose-600 transition-colors"
                          >
                            Delete List
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Inspected Leads Drawer Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {viewingBatch ? (
              <motion.div
                key={viewingBatch.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="rounded-lg border border-zinc-900 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-950 shadow-md sticky top-20"
              >
                <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4 gap-2">
                  <div className="min-w-0">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">
                      List Inspector
                    </span>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate block mt-0.5">
                      {viewingBatch.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingBatch(null)}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold text-sm"
                  >
                    Close
                  </button>
                </div>

                <Input
                  type="search"
                  placeholder="Search leads in this batch..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 mb-4 focus-visible:ring-zinc-900"
                />

                {drawerLoading ? (
                  <div className="text-xs text-zinc-500 text-center py-10">
                    Loading list leads...
                  </div>
                ) : filteredDrawerLeads.length === 0 ? (
                  <div className="text-xs text-zinc-500 text-center py-10">
                    No matching leads in this list.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredDrawerLeads.map((l) => (
                      <div
                        key={l.id}
                        className="group border border-zinc-100 dark:border-zinc-900 p-2.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors flex justify-between items-center"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                            {l.firstName} {l.lastName}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono block">
                            {l.phone} · {l.state || "US"}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
                            {l.email}
                          </span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleDeleteLeadInDrawer(l)}
                          className="text-[10px] font-semibold text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/20">
                Select a batch list on the left to inspect its individual leads here.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
