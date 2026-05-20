"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyFolders, setBusyFolders] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string>("");

  async function loadBatches() {
    try {
      const res = await fetch("/api/leads-hub/batches", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as { batches: LeadsHubBatch[] };
      setBatches(data.batches || []);
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
  }, [batches]);

  const folders = useMemo<FolderGroup[]>(() => {
    const map = new Map<string, LeadsHubBatch[]>();
    for (const batch of batches) {
      const key = batch.folder.trim();
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
  }, [batches]);

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
    setBusyFolders((prev) => ({ ...prev, [folderKey]: true }));
    setStatus("");
    try {
      const group = folders.find((f) => f.folder === folderKey);
      if (!group) return;
      for (const batch of group.items) {
        // Sequential updates keep folder moves dependable for large groups.
        // eslint-disable-next-line no-await-in-loop
        await saveFolderForBatch(batch, normalized);
      }
      setBatches((prev) => prev.map((batch) => (batch.folder.trim() === folderKey ? { ...batch, folder: normalized } : batch)));
      setDrafts((prev) => {
        const next = { ...prev };
        for (const batch of group.items) next[batch.id] = normalized;
        return next;
      });
      setStatus(normalized ? `Moved "${folderKey || "Unsorted"}" to "${normalized}"` : `Cleared "${folderKey || "Unsorted"}"`);
      broadcastLeadsHubUpdate();
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusyFolders((prev) => ({ ...prev, [folderKey]: false }));
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Folders</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage Leads Hub folders in one place. Rename a folder by moving all of its batches together.
          </p>
        </div>
        <Link href="/leads/batches" className="text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">
          Back to Batches
        </Link>
      </header>

      {status && <p className="text-xs text-zinc-500 dark:text-zinc-400">{status}</p>}

      {loading ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          Loading folders...
        </div>
      ) : (
        <div className="space-y-4">
          {folders.map((group) => {
            const folderKey = group.folder.trim();
            const draft = drafts[folderKey] ?? group.folder;
            const busy = !!busyFolders[folderKey];
            return (
              <div key={group.folder || "unsorted"} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">{group.folder || "Unsorted"}</h2>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {group.items.length} batches · {group.totalLeads.toLocaleString()} leads
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void applyFolderToGroup(group.folder, "")}
                      disabled={busy}
                      className="h-8 bg-zinc-900 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                    >
                      Clear folder
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Input
                    value={draft}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [folderKey]: e.target.value }))
                    }
                    placeholder="Rename folder"
                    className="h-9 max-w-sm bg-white text-sm dark:bg-zinc-900"
                  />
                  <Button
                    type="button"
                    onClick={() => void applyFolderToGroup(group.folder, draft)}
                    disabled={busy}
                    className="h-9 bg-zinc-900 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                  >
                    {busy ? "Saving…" : "Save"}
                  </Button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((batch) => (
                    <div key={batch.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{batch.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {batch.leadCount} leads · {batch.fileName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
