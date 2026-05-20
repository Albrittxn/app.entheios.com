"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  id: string;
  fileName: string;
  name: string;
  folder: string;
  rowCount: number;
  headers: string[];
  rows: string[][];
  map: ColumnMap;
  missing: string[];
};

export default function LeadsBatchesPage() {
  const toast = useToast();

  const [batches, setBatches] = useState<LeadsHubBatch[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploadFolder, setUploadFolder] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importingIds, setImportingIds] = useState<string[]>([]);
  const [folderDrafts, setFolderDrafts] = useState<Record<string, string>>({});
  const [savingFolderIds, setSavingFolderIds] = useState<string[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [bulkFolder, setBulkFolder] = useState("");
  const [movingBulk, setMovingBulk] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [viewingBatch, setViewingBatch] = useState<LeadsHubBatch | null>(null);
  const [viewingLeads, setViewingLeads] = useState<LeadsHubLead[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const optimisticFoldersRef = useRef<Record<string, string>>({});

  async function loadBatches() {
    try {
      const res = await fetch("/api/leads-hub/batches", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as { batches?: LeadsHubBatch[]; folders?: string[] };
        setBatches(
          (data.batches || []).map((batch) => ({
            ...batch,
            folder: optimisticFoldersRef.current[batch.id] ?? batch.folder,
          })),
        );
        setFolders(data.folders || []);
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

  useEffect(() => {
    setFolderDrafts((prev) => {
      const next = { ...prev };
      for (const batch of batches) {
        if (next[batch.id] === undefined) next[batch.id] = batch.folder;
      }
      return next;
    });
  }, [batches]);

  useEffect(() => {
    setSelectedBatchIds((prev) => prev.filter((id) => batches.some((batch) => batch.id === id)));
  }, [batches]);

  const folderSuggestions = useMemo(
    () =>
      [...new Set([...folders, ...batches.map((batch) => batch.folder.trim())].filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
      ),
    [batches, folders],
  );

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
              b.id === viewingBatch.id ? { ...b, leadCount: (data.leads || []).length } : b,
            ),
          );
        }
      })();
    }
  });

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

  async function handleDeleteBatch(batch: LeadsHubBatch) {
    try {
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
          const restoreRes = await fetch("/api/leads-hub/batches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: batch.id,
              name: batch.name,
              fileName: batch.fileName,
              uploadedAt: batch.uploadedAt,
              folder: batch.folder,
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
      if (viewingBatch?.id === batch.id) setViewingBatch(null);
      broadcastLeadsHubUpdate();
    } catch (err) {
      console.error(err);
      toast.show("Error deleting batch");
    }
  }

  async function handleDeleteLeadInDrawer(lead: LeadsHubLead) {
    try {
      const res = await fetch(`/api/leads-hub/leads/${lead.id}?batchId=${lead.batchId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not delete lead");

      setViewingLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setBatches((prev) =>
        prev.map((b) => (b.id === lead.batchId ? { ...b, leadCount: b.leadCount - 1 } : b)),
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
            setViewingLeads((prev) => [...prev, lead]);
            setBatches((prev) =>
              prev.map((b) => (b.id === lead.batchId ? { ...b, leadCount: b.leadCount + 1 } : b)),
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

  function defaultBatchName(file: File): string {
    return file.name.replace(/\.[^/.]+$/, "");
  }

  function normalizeFolderName(value: string): string {
    return value.trim().slice(0, 120);
  }

  function makeUploadId(seed: string): string {
    return `${seed}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function parseFile(file: File, folder: string): Promise<PendingUpload> {
    const { headers, rows, rowCount } = await parseSheet(file);
    const { map, missing } = matchColumns(headers);
    return {
      id: makeUploadId(file.name),
      fileName: file.name,
      name: defaultBatchName(file),
      folder,
      rowCount,
      headers,
      rows,
      map,
      missing,
    };
  }

  async function handleFiles(files: File[], folder: string) {
    setParseError(null);
    if (!files.length) return;
    setParsing(true);
    try {
      const parsed = await Promise.all(
        files.map(async (file) => {
          try {
            return { ok: true as const, value: await parseFile(file, folder) };
          } catch (err) {
            return {
              ok: false as const,
              error: `${file.name}: ${(err as Error).message ?? "Couldn't read file. CSV/XLSX only."}`,
            };
          }
        }),
      );
      const successful = parsed.filter((result): result is { ok: true; value: PendingUpload } => result.ok).map((result) => result.value);
      const failures = parsed.filter((result): result is { ok: false; error: string } => !result.ok).map((result) => result.error);
      if (successful.length) {
        setPendingUploads((prev) => [...prev, ...successful]);
      }
      if (failures.length) {
        setParseError(failures.join("\n"));
      }
    } catch (err) {
      setParseError((err as Error).message ?? "Couldn't read file. CSV/XLSX only.");
    } finally {
      setParsing(false);
    }
  }

  function handlePasteText(text: string, sourceName: string, folder: string) {
    setParseError(null);
    const trimmed = text.trim();
    if (!trimmed) return;
    setParsing(true);
    try {
      const { headers, rows, rowCount } = parseDelimitedText(trimmed);
      const { map, missing } = matchColumns(headers);
      setPendingUploads((prev) => [
        ...prev,
        {
          id: makeUploadId(sourceName),
          fileName: sourceName,
          name: sourceName,
          folder,
          rowCount,
          headers,
          rows,
          map,
          missing,
        },
      ]);
    } catch (err) {
      setParseError((err as Error).message ?? "Couldn't read pasted data.");
    } finally {
      setParsing(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) void handleFiles(files, normalizeFolderName(uploadFolder));
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) void handleFiles(files, normalizeFolderName(uploadFolder));
  }

  function onPasteZone(e: React.ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData?.getData("text/plain") ?? "";
    if (text.trim()) {
      e.preventDefault();
      handlePasteText(text, "Clipboard Paste", normalizeFolderName(uploadFolder));
    }
  }

  function onFolderChange(value: string) {
    const nextFolder = normalizeFolderName(value);
    setUploadFolder(nextFolder);
    setPendingUploads((prev) => prev.map((item) => ({ ...item, folder: nextFolder })));
  }

  async function moveBatches(batchIds: string[], folder: string) {
    const normalizedFolder = normalizeFolderName(folder);
    const targets = batches.filter((batch) => batchIds.includes(batch.id));
    if (!targets.length) return;

    const changedTargets = targets.filter((batch) => batch.folder !== normalizedFolder);
    if (!changedTargets.length) {
      toast.show("Folder already up to date");
      return;
    }

    const previousFolders = Object.fromEntries(changedTargets.map((batch) => [batch.id, batch.folder]));
    const changedIds = changedTargets.map((batch) => batch.id);
    setSavingFolderIds((prev) => [...new Set([...prev, ...changedIds])]);
    for (const id of changedIds) optimisticFoldersRef.current[id] = normalizedFolder;
    setBatches((prev) =>
      prev.map((item) =>
        changedIds.includes(item.id) ? { ...item, folder: normalizedFolder } : item,
      ),
    );
    setFolderDrafts((prev) => {
      const next = { ...prev };
      for (const id of changedIds) next[id] = normalizedFolder;
      return next;
    });

    try {
      for (const id of changedIds) {
        // Keep writes dependable and preserve user feedback order.
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch("/api/leads-hub/batches", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, folder: normalizedFolder }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update folder");
        }
        delete optimisticFoldersRef.current[id];
      }
      broadcastLeadsHubUpdate();
      toast.show(
        normalizedFolder
          ? `Moved ${changedIds.length} batch${changedIds.length === 1 ? "" : "es"} to ${normalizedFolder}`
          : `Moved ${changedIds.length} batch${changedIds.length === 1 ? "" : "es"} to Unsorted`,
      );
    } catch (err) {
      setBatches((prev) =>
        prev.map((item) =>
          changedIds.includes(item.id)
            ? { ...item, folder: previousFolders[item.id] ?? item.folder }
            : item,
        ),
      );
      setFolderDrafts((prev) => {
        const next = { ...prev };
        for (const id of changedIds) next[id] = previousFolders[id] ?? "";
        return next;
      });
      for (const id of changedIds) delete optimisticFoldersRef.current[id];
      toast.show((err as Error).message || "Failed to update folder");
    } finally {
      setSavingFolderIds((prev) => prev.filter((id) => !changedIds.includes(id)));
    }
  }

  async function saveBatchFolder(batch: LeadsHubBatch) {
    await moveBatches([batch.id], folderDrafts[batch.id] ?? batch.folder);
  }

  function toggleBatchSelection(id: string) {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((current) => current !== id) : [...prev, id],
    );
  }

  async function moveSelectedBatches() {
    if (!selectedBatchIds.length) {
      toast.show("Select one or more batches first");
      return;
    }
    setMovingBulk(true);
    try {
      await moveBatches(selectedBatchIds, bulkFolder);
      setSelectedBatchIds([]);
    } finally {
      setMovingBulk(false);
    }
  }

  function updatePending(id: string, patch: Partial<PendingUpload>) {
    setPendingUploads((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function submitImport(item: PendingUpload) {
    if (item.missing.length > 0) return;
    if (importingIds.includes(item.id)) return;
    setImportingIds((prev) => [...prev, item.id]);

    const m = item.map;
    const leadsToImport = item.rows.map((row) => {
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
          name: item.name,
          fileName: item.fileName,
          folder: item.folder,
          leads: leadsToImport,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to import leads");
      }

      toast.show(`Successfully imported ${leadsToImport.length} leads into "${item.name}"`);
      setPendingUploads((prev) => prev.filter((p) => p.id !== item.id));
      await loadBatches();
      broadcastLeadsHubUpdate();
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setImportingIds((prev) => prev.filter((id) => id !== item.id));
    }
  }

  async function importAll() {
    const queue = [...pendingUploads];
    for (const item of queue) {
      if (item.missing.length > 0) continue;
      // Sequential imports keep feedback easy to follow.
      // eslint-disable-next-line no-await-in-loop
      await submitImport(item);
    }
  }

  const filteredDrawerLeads = useMemo(() => {
    const q = drawerSearch.trim().toLowerCase();
    if (!q) return viewingLeads;
    return viewingLeads.filter((l) =>
      [l.firstName, l.lastName, l.email, l.phone, l.brokerage, l.state]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [viewingLeads, drawerSearch]);

  const groupedBatches = useMemo(() => {
    const groups = new Map<string, LeadsHubBatch[]>();
    for (const batch of batches) {
      const folder = batch.folder.trim() || "";
      const next = groups.get(folder) ?? [];
      next.push(batch);
      groups.set(folder, next);
    }
    return [...groups.entries()]
      .map(([folder, items]) => ({
        folder,
        items: items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
      }))
      .sort((a, b) => {
        if (a.folder === b.folder) return 0;
        if (!a.folder) return -1;
        if (!b.folder) return 1;
        return a.folder.localeCompare(b.folder);
      });
  }, [batches]);

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
            Batches are grouped lead lists. Upload CSV/XLSX files here and place each batch into a folder section for the team.
          </p>
        </div>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {batches.length.toLocaleString()} {batches.length === 1 ? "list" : "lists"}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Upload batches
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  CSV/XLSX only. Every file becomes its own batch.
                </p>
              </div>
              <div className="min-w-[220px] flex-1 sm:max-w-xs">
                <Input
                  type="text"
                  value={uploadFolder}
                  onChange={(e) => onFolderChange(e.target.value)}
                  placeholder="Optional folder for this upload"
                  className="h-8 text-xs bg-white dark:bg-zinc-900"
                />
              </div>
            </div>

            <div>
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
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                className={cn(
                  "flex min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-4 text-center transition-all",
                  dragOver
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                    : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:border-zinc-700",
                )}
              >
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={onFileChange}
                  className="sr-only"
                />
                {!pendingUploads.length && !parsing && (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-zinc-400 dark:text-zinc-500"
                    >
                      <path d="M12 5v14m-7-7h14" />
                    </svg>
                    <div className="mt-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Add and verify new list files
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Folders are created from batches later, not uploaded directly.
                    </div>
                  </>
                )}
                {parsing && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Parsing sheet...
                  </div>
                )}
                {!!pendingUploads.length && !parsing && (
                  <div className="w-full text-left" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Import Verification
                      </span>
                      <div className="flex items-center gap-3">
                        {pendingUploads.length > 1 && (
                          <button
                            type="button"
                            onClick={() => void importAll()}
                            className="text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                          >
                            Import All
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setPendingUploads([]);
                            if (fileRef.current) fileRef.current.value = "";
                          }}
                          className="text-xs font-semibold text-rose-500"
                        >
                          Clear Queue
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {pendingUploads.map((pending) => (
                        <div key={pending.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                          <div className="mb-3 flex items-start justify-between gap-3 border-b border-zinc-100 pb-2 dark:border-zinc-800">
                            <div className="min-w-0">
                              <label
                                htmlFor={`batch-name-input-${pending.id}`}
                                className="block mb-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
                              >
                                Verify Batch / List Name
                              </label>
                              <Input
                                id={`batch-name-input-${pending.id}`}
                                type="text"
                                value={pending.name}
                                onChange={(e) => updatePending(pending.id, { name: e.target.value })}
                                className="h-8 text-xs bg-white dark:bg-zinc-900"
                                placeholder="Batch Title"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setPendingUploads((prev) => prev.filter((p) => p.id !== pending.id))}
                              className="text-xs font-semibold text-rose-500"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="text-[11px] text-zinc-500">
                            Parsed <strong>{pending.rowCount.toLocaleString()}</strong> rows from{" "}
                            <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">{pending.fileName}</code>
                          </div>
                          <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            Folder: <span className="font-medium text-zinc-700 dark:text-zinc-200">{pending.folder || "Unsorted"}</span>
                          </div>

                          <div className="mt-3">
                            <span className="mb-1 block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                              Mapped Columns:
                            </span>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[9px]">
                              {REQUIRED_COLUMNS.map((c) => {
                                const ok = pending.map[c.key] !== null;
                                return (
                                  <div
                                    key={c.key}
                                    className={cn(
                                      "flex items-center gap-1 rounded border px-1.5 py-0.5",
                                      ok
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20"
                                        : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/20",
                                    )}
                                  >
                                    <span>{ok ? "✓" : "✗"}</span>
                                    <span className="truncate">{c.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-end gap-2 pt-2">
                            <Button
                              type="button"
                              onClick={() => void submitImport(pending)}
                              disabled={pending.missing.length > 0 || !pending.name.trim() || importingIds.includes(pending.id)}
                              className="h-7 bg-zinc-900 text-[11px] text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                            >
                              {importingIds.includes(pending.id) ? "Importing…" : "Confirm & Add List"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {parseError && (
                <p className="mt-2 whitespace-pre-line text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {parseError}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Batch Library
            </h2>

            {loading ? (
              <div className="py-6 text-center text-xs text-zinc-500">Loading list index...</div>
            ) : batches.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">No uploaded batch lists yet.</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {selectedBatchIds.length} selected
                  </span>
                  <select
                    value={bulkFolder}
                    onChange={(e) => setBulkFolder(e.target.value)}
                    className="h-8 min-w-[180px] rounded-md border border-zinc-300 bg-white px-3 text-[11px] text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
                  >
                    <option value="">Move selected to Unsorted</option>
                    {folderSuggestions.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => void moveSelectedBatches()}
                    disabled={movingBulk || !selectedBatchIds.length}
                    className="h-8 bg-zinc-900 text-[11px] text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                  >
                    {movingBulk ? "Moving…" : "Move selected"}
                  </Button>
                  {!!selectedBatchIds.length && (
                    <button
                      type="button"
                      onClick={() => setSelectedBatchIds([])}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {groupedBatches.map((group) => (
                  <div key={group.folder || "unsorted"} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {group.folder || "Unsorted"}
                      </h3>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {group.items.length} {group.items.length === 1 ? "list" : "lists"}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <AnimatePresence initial={false}>
                        {group.items.map((b) => {
                          const isViewing = viewingBatch?.id === b.id;
                          return (
                            <motion.div
                              key={b.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className={cn(
                                "grid gap-3 border-b bg-white px-4 py-3 transition-all md:grid-cols-[auto_minmax(0,1.2fr)_120px_minmax(220px,320px)_auto] md:items-center dark:bg-zinc-950",
                                isViewing
                                  ? "border-zinc-900 ring-1 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50",
                              )}
                            >
                              <div className="flex items-center md:justify-center">
                                <input
                                  type="checkbox"
                                  checked={selectedBatchIds.includes(b.id)}
                                  onChange={() => toggleBatchSelection(b.id)}
                                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400/40"
                                  aria-label={`Select ${b.name}`}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {b.name}
                                  </span>
                                  <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    {b.leadCount.toLocaleString()} leads
                                  </span>
                                </div>
                                <div className="mt-1 truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                  {b.fileName}
                                </div>
                                <div className="mt-1 font-mono text-[10px] text-zinc-500">
                                  Uploaded {formatUploadedDate(b.uploadedAt)}
                                </div>
                              </div>
                              <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                {b.folder || "Unsorted"}
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={folderDrafts[b.id] ?? b.folder}
                                  onChange={(e) =>
                                    setFolderDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                                  }
                                  className="h-8 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-[11px] text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
                                >
                                  <option value="">Unsorted</option>
                                  {folderSuggestions.map((folder) => (
                                    <option key={folder} value={folder}>
                                      {folder}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  type="button"
                                  onClick={() => void saveBatchFolder(b)}
                                  disabled={savingFolderIds.includes(b.id)}
                                  className="h-8 shrink-0 bg-zinc-900 text-[11px] text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                                >
                                  {savingFolderIds.includes(b.id) ? "Saving…" : "Save"}
                                </Button>
                              </div>
                              <div className="flex items-center justify-between gap-3 md:justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleViewLeads(b)}
                                  className="text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                                >
                                  {isViewing ? "Inspecting" : "View Leads"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBatch(b)}
                                  className="text-xs font-semibold text-zinc-400 transition-colors hover:text-rose-600"
                                >
                                  Delete List
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <datalist id="leads-hub-folder-suggestions">
          {folderSuggestions.map((folder) => (
            <option key={folder} value={folder} />
          ))}
        </datalist>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {viewingBatch ? (
              <motion.div
                key={viewingBatch.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="sticky top-20 rounded-lg border border-zinc-900 bg-white p-5 shadow-md dark:border-zinc-700 dark:bg-zinc-950"
              >
                <div className="mb-4 flex items-start justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      List Inspector
                    </span>
                    <h3 className="mt-0.5 block truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {viewingBatch.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingBatch(null)}
                    className="text-sm font-bold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Close
                  </button>
                </div>

                <Input
                  type="search"
                  placeholder="Search leads in this batch..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="mb-4 h-8 border-zinc-200 bg-zinc-50 text-xs focus-visible:ring-zinc-900 dark:bg-zinc-900"
                />

                {drawerLoading ? (
                  <div className="py-10 text-center text-xs text-zinc-500">Loading list leads...</div>
                ) : filteredDrawerLeads.length === 0 ? (
                  <div className="py-10 text-center text-xs text-zinc-500">No matching leads in this list.</div>
                ) : (
                  <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                    {filteredDrawerLeads.map((l) => (
                      <div
                        key={l.id}
                        className="group flex items-center justify-between rounded-md border border-zinc-100 p-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/50"
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {l.firstName} {l.lastName}
                          </span>
                          <span className="block font-mono text-[10px] text-zinc-500">
                            {l.phone} · {l.state || "US"}
                          </span>
                          <span className="block truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                            {l.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLeadInDrawer(l)}
                          className="text-[10px] font-semibold text-zinc-400 opacity-0 transition-colors hover:text-rose-500 group-hover:opacity-100"
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
