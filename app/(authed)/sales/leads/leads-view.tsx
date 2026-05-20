"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";

type UserBatchStatus = { downloaded_at?: number; completed_at?: number };
type BatchRow = {
  id: string;
  name: string;
  folder?: string;
  source_batch_id?: string;
  lead_count: number;
  columns: string[];
  created_at: number;
  created_by: string;
  status?: UserBatchStatus;
};

type Filter = "all" | "new" | "downloaded";

function uiStatus(b: BatchRow): "new" | "downloaded" {
  return b.status?.downloaded_at ? "downloaded" : "new";
}

type SalesLeadsViewProps = {
  isAdmin: boolean;
};

type FolderGroup = {
  folder: string;
  items: BatchRow[];
};

export function SalesLeadsView({ isAdmin: _isAdmin }: SalesLeadsViewProps) {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [filter, setFilter] = useState<Filter>("new");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const optimisticStatusByIdRef = useRef<Record<string, UserBatchStatus>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sales/batches", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `HTTP ${r.status}`);
        return;
      }
      const j = (await r.json()) as { batches: BatchRow[] };
      const nextBatches = j.batches.map((batch) => ({
        ...batch,
        status: optimisticStatusByIdRef.current[batch.id] ?? batch.status,
      }));
      for (const batch of nextBatches) {
        const optimistic = optimisticStatusByIdRef.current[batch.id];
        if (
          optimistic &&
          optimistic.downloaded_at === batch.status?.downloaded_at &&
          optimistic.completed_at === batch.status?.completed_at
        ) {
          delete optimisticStatusByIdRef.current[batch.id];
        }
      }
      setBatches(nextBatches);
      setLoading(false);
    } catch {
      setError("Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveToNew(id: string) {
    const previous = batches;
    optimisticStatusByIdRef.current[id] = {
      ...(batches.find((batch) => batch.id === id)?.status ?? {}),
      downloaded_at: undefined,
      completed_at: undefined,
    };
    setBatches((current) =>
      current.map((batch) =>
        batch.id === id
          ? {
              ...batch,
              status: {
                ...batch.status,
                downloaded_at: undefined,
                completed_at: undefined,
              },
            }
          : batch,
      ),
    );

    const r = await fetch(`/api/sales/batches/${encodeURIComponent(id)}/complete`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (r.ok) return;
    delete optimisticStatusByIdRef.current[id];
    setBatches(previous);
  }

  function onDownload(b: BatchRow) {
    optimisticStatusByIdRef.current[b.id] = {
      ...b.status,
      downloaded_at: b.status?.downloaded_at ?? Date.now(),
    };
    // Optimistically move the batch into Downloaded immediately for this user.
    setBatches((prev) =>
      prev.map((x) =>
        x.id === b.id
          ? {
              ...x,
              status: {
                ...x.status,
                downloaded_at: x.status?.downloaded_at ?? Date.now(),
              },
            }
          : x,
      ),
    );
  }

  const counts: Record<Filter, number> = {
    all: batches.length,
    new: batches.filter((b) => uiStatus(b) === "new").length,
    downloaded: batches.filter((b) => uiStatus(b) === "downloaded").length,
  };

  const filterLabels: Record<Filter, string> = {
    all: "All",
    new: "New",
    downloaded: "Downloaded",
  };

  const visible = useMemo(
    () => batches.filter((b) => filter === "all" || uiStatus(b) === filter),
    [batches, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, BatchRow[]>();
    for (const batch of visible) {
      const folder = batch.folder?.trim() || "";
      const current = map.get(folder) ?? [];
      current.push(batch);
      map.set(folder, current);
    }

    return [...map.entries()]
      .sort(([a], [b]) => {
        if (!a && !b) return 0;
        if (!a) return -1;
        if (!b) return 1;
        return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
      })
      .map(([folder, items]) => ({
        folder,
        items: [...items].sort((a, b) => {
          const comparison = a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
            numeric: true,
          });
          return sortOrder === "asc" ? comparison : -comparison;
        }),
      }));
  }, [visible, sortOrder]);

  function toggleFolder(folder: string) {
    const key = folder || "unsorted";
    setCollapsedFolders((current) => ({ ...current, [key]: !current[key] }));
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
        Failed to load batches: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["new", "downloaded", "all"] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              <span>{filterLabels[f]}</span>
              <span className="font-mono text-[10px] opacity-70">{counts[f]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSortOrder((current) => (current === "asc" ? "desc" : "asc"))}
          className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Title {sortOrder === "asc" ? "A-Z" : "Z-A"}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Loading…</div>
      ) : !visible.length ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          {batches.length === 0
            ? "No batches yet. Admin can upload one in the Admin tab."
            : "No batches in this view."}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.folder || "unsorted"} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleFolder(group.folder)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1 text-left"
              >
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {group.folder || "Unsorted"}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {group.items.length} {group.items.length === 1 ? "batch" : "batches"}
                  </p>
                </div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {collapsedFolders[group.folder || "unsorted"] ? "Show" : "Hide"}
                </span>
              </button>
              {!collapsedFolders[group.folder || "unsorted"] &&
                group.items.map((b) => {
                const s = uiStatus(b);
                const dt = new Date(b.created_at).toISOString().slice(0, 10);
                return (
                  <div
                    key={b.id}
                    className={`grid grid-cols-1 items-center gap-3 rounded-lg border p-4 sm:grid-cols-[1.4fr_auto_auto_auto] ${
                      s === "downloaded"
                        ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
                        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {b.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        added {dt}
                        {b.status?.downloaded_at
                          ? ` · downloaded ${new Date(b.status.downloaded_at).toISOString().slice(0, 10)}`
                          : ""}
                      </div>
                    </div>
                    <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {b.lead_count} leads
                    </div>
                    <StatusPill s={s} />
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/sales/batches/${encodeURIComponent(b.id)}/csv`}
                        onClick={() => onDownload(b)}
                        className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        download
                      >
                        Download CSV
                      </a>
                      {s === "downloaded" && (
                        <button
                          type="button"
                          onClick={() => void moveToNew(b.id)}
                          className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          Move to New
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ s }: { s: "new" | "downloaded" }) {
  const labels = { new: "New", downloaded: "Downloaded" } as const;
  const classes = {
    new:
      "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
    downloaded:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  } as const;
  return (
    <span
      className={`inline-flex justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${classes[s]}`}
    >
      {labels[s]}
    </span>
  );
}
