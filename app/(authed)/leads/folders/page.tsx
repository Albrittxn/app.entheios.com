"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { broadcastLeadsHubUpdate, useLeadsHubSync } from "@/lib/leads-hub-sync";
import type { LeadsHubBatch } from "@/lib/leads-hub-store";

type FolderGroup = {
  folder: string;
  items: LeadsHubBatch[];
  totalLeads: number;
};

function normalizeFolderName(value: string): string {
  return value.trim().slice(0, 120);
}

export default function LeadsFoldersPage() {
  const [batches, setBatches] = useState<LeadsHubBatch[]>([]);
  const [foldersList, setFoldersList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [batchDrafts, setBatchDrafts] = useState<Record<string, string>>({});
  const [busyFolders, setBusyFolders] = useState<Record<string, boolean>>({});
  const [movingBatchIds, setMovingBatchIds] = useState<Record<string, boolean>>({});
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const optimisticCreatedFoldersRef = useRef<Set<string>>(new Set());
  const optimisticDeletedFoldersRef = useRef<Set<string>>(new Set());
  const optimisticBatchFoldersRef = useRef<Record<string, string>>({});

  function mergeFolderState(serverFolders: string[], batchList: LeadsHubBatch[]): string[] {
    const next = new Set<string>();
    for (const folder of serverFolders) {
      const normalized = normalizeFolderName(folder);
      if (normalized) next.add(normalized);
    }
    for (const batch of batchList) {
      const normalized = normalizeFolderName(batch.folder);
      if (normalized) next.add(normalized);
    }
    for (const folder of optimisticCreatedFoldersRef.current) next.add(folder);
    for (const folder of optimisticDeletedFoldersRef.current) next.delete(folder);
    return [...next].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
  }

  async function loadBatches() {
    try {
      const res = await fetch("/api/leads-hub/batches", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as { batches: LeadsHubBatch[]; folders?: string[] };
      const nextBatches = (data.batches || []).map((batch) => ({
        ...batch,
        folder: optimisticBatchFoldersRef.current[batch.id] ?? batch.folder,
      }));
      for (const batch of nextBatches) {
        if (optimisticBatchFoldersRef.current[batch.id] === batch.folder) {
          delete optimisticBatchFoldersRef.current[batch.id];
        }
      }
      setBatches(nextBatches);
      setFoldersList(mergeFolderState(data.folders || [], nextBatches));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, []);

  useLeadsHubSync(() => {
    void loadBatches();
  });

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const batch of batches) {
        const key = batch.folder.trim();
        if (next[key] === undefined) next[key] = batch.folder || "";
      }
      return next;
    });
    setBatchDrafts((prev) => {
      const next = { ...prev };
      for (const batch of batches) {
        if (next[batch.id] === undefined) next[batch.id] = batch.folder || "";
      }
      return next;
    });
  }, [batches]);

  const folderSuggestions = useMemo(
    () =>
      [...new Set([...foldersList, ...batches.map((batch) => batch.folder.trim())].filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
      ),
    [batches, foldersList],
  );

  const folders = useMemo<FolderGroup[]>(() => {
    const map = new Map<string, LeadsHubBatch[]>();
    for (const folder of foldersList) {
      const key = folder.trim();
      if (key) map.set(key, map.get(key) ?? []);
    }
    for (const batch of batches) {
      const key = batch.folder.trim();
      if (!key) continue;
      const current = map.get(key) ?? [];
      current.push(batch);
      map.set(key, current);
    }

    return [...map.entries()]
      .map(([folder, items]) => ({
        folder,
        items: items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
        totalLeads: items.reduce((sum, item) => sum + item.leadCount, 0),
      }))
      .sort((a, b) => {
        if (!a.folder && !b.folder) return 0;
        if (!a.folder) return -1;
        if (!b.folder) return 1;
        return a.folder.localeCompare(b.folder);
      });
  }, [batches, foldersList]);

  async function saveFolderForBatch(batch: LeadsHubBatch, folder: string) {
    const nextFolder = normalizeFolderName(folder);
    const res = await fetch("/api/leads-hub/batches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: batch.id, folder: nextFolder }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Failed to move batch");
    }
  }

  async function applyFolderToGroup(currentFolder: string, nextFolder: string) {
    const normalized = normalizeFolderName(nextFolder);
    const folderKey = currentFolder.trim();
    const group = folders.find((f) => f.folder === folderKey);
    const groupItems = group?.items ?? [];
    setBusyFolders((prev) => ({ ...prev, [folderKey]: true }));
    setStatus("");
    try {
      if (!group) return;
      for (const batch of groupItems) {
        optimisticBatchFoldersRef.current[batch.id] = normalized;
        // Sequential updates keep folder moves dependable for large groups.
        // eslint-disable-next-line no-await-in-loop
        await saveFolderForBatch(batch, normalized);
      }
      setBatches((prev) => prev.map((batch) => (batch.folder.trim() === folderKey ? { ...batch, folder: normalized } : batch)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[folderKey];
        if (normalized) next[normalized] = normalized;
        return next;
      });
      setBatchDrafts((prev) => {
        const next = { ...prev };
        for (const batch of groupItems) next[batch.id] = normalized;
        return next;
      });
      setStatus(normalized ? `Moved "${folderKey || "Unsorted"}" to "${normalized}"` : `Cleared "${folderKey || "Unsorted"}"`);
      broadcastLeadsHubUpdate();
    } catch (err) {
      for (const batch of groupItems) delete optimisticBatchFoldersRef.current[batch.id];
      setStatus((err as Error).message);
    } finally {
      setBusyFolders((prev) => ({ ...prev, [folderKey]: false }));
    }
  }

  async function moveSingleBatch(batch: LeadsHubBatch) {
    const nextFolder = normalizeFolderName(batchDrafts[batch.id] ?? batch.folder);
    if (nextFolder === batch.folder) {
      setStatus("Batch is already in that folder.");
      return;
    }
    setMovingBatchIds((prev) => ({ ...prev, [batch.id]: true }));
    setStatus("");
    try {
      optimisticBatchFoldersRef.current[batch.id] = nextFolder;
      await saveFolderForBatch(batch, nextFolder);
      setBatches((prev) =>
        prev.map((item) => (item.id === batch.id ? { ...item, folder: nextFolder } : item)),
      );
      setBatchDrafts((prev) => ({ ...prev, [batch.id]: nextFolder }));
      setDrafts((prev) => {
        const next = { ...prev };
        const previousFolder = batch.folder.trim();
        if (previousFolder && next[previousFolder] === undefined) next[previousFolder] = previousFolder;
        if (nextFolder && next[nextFolder] === undefined) next[nextFolder] = nextFolder;
        return next;
      });
      setStatus(nextFolder ? `Moved "${batch.name}" to "${nextFolder}"` : `Moved "${batch.name}" to Unsorted`);
      broadcastLeadsHubUpdate();
    } catch (err) {
      delete optimisticBatchFoldersRef.current[batch.id];
      setStatus((err as Error).message);
    } finally {
      setMovingBatchIds((prev) => ({ ...prev, [batch.id]: false }));
    }
  }

  function toggleFolder(folder: string) {
    setCollapsedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  }

  async function removeFolder(folder: string) {
    if (!confirm(`Delete "${folder}"? Batches inside it will be moved to Unsorted.`)) return;
    setDeletingFolder(folder);
    setStatus("");
    try {
      const res = await fetch(`/api/leads-hub/batches?folder=${encodeURIComponent(folder)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete folder");
      optimisticDeletedFoldersRef.current.add(folder);
      optimisticCreatedFoldersRef.current.delete(folder);
      for (const batch of batches) {
        if (batch.folder.trim() === folder) optimisticBatchFoldersRef.current[batch.id] = "";
      }
      setFoldersList((prev) => prev.filter((item) => item !== folder));
      setBatches((prev) =>
        prev.map((batch) =>
          batch.folder.trim() === folder ? { ...batch, folder: "" } : batch,
        ),
      );
      setStatus(`Deleted "${folder}"`);
      broadcastLeadsHubUpdate();
    } catch (err) {
      optimisticDeletedFoldersRef.current.delete(folder);
      for (const batch of batches) {
        if (batch.folder.trim() === folder) delete optimisticBatchFoldersRef.current[batch.id];
      }
      setStatus((err as Error).message);
    } finally {
      setDeletingFolder(null);
    }
  }

  async function createFolder() {
    const folder = normalizeFolderName(newFolderName);
    if (!folder) {
      setStatus("Folder name required.");
      return;
    }
    if (folderSuggestions.includes(folder)) {
      setStatus("That folder already exists.");
      return;
    }
    setCreatingFolder(true);
    setStatus("");
    try {
      const res = await fetch("/api/leads-hub/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createFolder: true, folder }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; folder?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create folder");
      const createdFolder = normalizeFolderName(data.folder ?? folder);
      optimisticCreatedFoldersRef.current.add(createdFolder);
      optimisticDeletedFoldersRef.current.delete(createdFolder);
      setFoldersList((prev) =>
        [...new Set([...prev, createdFolder])].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
        ),
      );
      setDrafts((prev) => ({ ...prev, [createdFolder]: createdFolder }));
      setCollapsedFolders((prev) => ({ ...prev, [createdFolder]: false }));
      setNewFolderName("");
      setStatus(`Created "${createdFolder}"`);
      broadcastLeadsHubUpdate();
    } catch (err) {
      optimisticCreatedFoldersRef.current.delete(folder);
      setStatus((err as Error).message);
    } finally {
      setCreatingFolder(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Folders</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Folders are groups of batches. Upload happens in the Leads and Batches tabs, then organize batches here.
          </p>
        </div>
      </header>

      {status && <p className="text-xs text-zinc-500 dark:text-zinc-400">{status}</p>}

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              Create folder
            </label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createFolder();
                }
              }}
              placeholder="New folder name"
              className="h-9 bg-white text-sm dark:bg-zinc-900"
            />
          </div>
          <Button
            type="button"
            onClick={() => void createFolder()}
            disabled={creatingFolder}
            className="h-9 bg-zinc-900 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            {creatingFolder ? "Creating…" : "Create Folder"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          Loading folders...
        </div>
      ) : folders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          No folders yet. Create folders by assigning batches on the Batches tab.
        </div>
      ) : (
        <div className="space-y-4">
          {folders.map((group) => {
            const folderKey = group.folder.trim();
            const draft = drafts[folderKey] ?? group.folder;
            const busy = !!busyFolders[folderKey];
            const collapsed = !!collapsedFolders[folderKey];
            return (
              <div key={group.folder} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => toggleFolder(folderKey)}
                      className="flex items-center gap-2 text-left"
                    >
                      <h2 className="text-base font-semibold tracking-tight">{group.folder}</h2>
                      <span
                        className={`inline-flex transition-transform duration-200 ${
                          collapsed ? "-rotate-90" : "rotate-0"
                        } text-zinc-400 dark:text-zinc-500`}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </button>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {group.items.length} batches · {group.totalLeads.toLocaleString()} leads
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 py-4">
                    <Button
                      type="button"
                      onClick={() => void removeFolder(group.folder)}
                      disabled={deletingFolder === group.folder}
                      className="h-8 bg-rose-600 text-xs text-white hover:bg-rose-700"
                    >
                      {deletingFolder === group.folder ? "Deleting…" : "Delete folder"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void applyFolderToGroup(group.folder, "")}
                      disabled={busy || deletingFolder === group.folder}
                      className="h-8 bg-zinc-900 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                    >
                      Clear folder
                    </Button>
                  </div>
                </div>

                {!collapsed && (
                  <>
                <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-900">
                  <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={draft}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [folderKey]: e.target.value }))
                    }
                    placeholder="Rename folder"
                    disabled={deletingFolder === group.folder}
                    className="h-9 max-w-sm bg-white text-sm dark:bg-zinc-900"
                  />
                  <Button
                    type="button"
                    onClick={() => void applyFolderToGroup(group.folder, draft)}
                    disabled={busy || deletingFolder === group.folder}
                    className="h-9 bg-zinc-900 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                  >
                    {busy ? "Saving…" : "Save"}
                  </Button>
                </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-900">
                  {group.items.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      No batches in this folder yet.
                    </div>
                  ) : (
                    group.items.map((batch) => (
                      <div
                        key={batch.id}
                        className="grid gap-3 border-b border-zinc-100 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(220px,320px)_auto] md:items-center dark:border-zinc-900"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{batch.name}</div>
                          <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                            {batch.leadCount} leads · {batch.fileName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={batchDrafts[batch.id] ?? batch.folder}
                            onChange={(e) =>
                              setBatchDrafts((prev) => ({ ...prev, [batch.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void moveSingleBatch(batch);
                              }
                            }}
                            list="leads-folder-suggestions"
                            placeholder="Move batch to folder"
                            className="h-8 bg-white text-xs dark:bg-zinc-900"
                          />
                          <Button
                            type="button"
                            onClick={() => void moveSingleBatch(batch)}
                            disabled={!!movingBatchIds[batch.id]}
                            className="h-8 bg-zinc-900 px-3 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                          >
                            {movingBatchIds[batch.id] ? "Moving…" : "Move"}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <datalist id="leads-folder-suggestions">
        {folderSuggestions.map((folder) => (
          <option key={folder} value={folder} />
        ))}
      </datalist>
    </section>
  );
}
