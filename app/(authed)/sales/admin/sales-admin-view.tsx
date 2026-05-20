"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BatchMeta = {
  id: string;
  name: string;
  lead_count: number;
  columns: string[];
  created_at: number;
  created_by: string;
};

type LeadsHubBatch = {
  id: string;
  name: string;
  fileName: string;
  leadCount: number;
  uploadedAt: string;
};

export function SalesAdminView() {
  const [batches, setBatches] = useState<BatchMeta[]>([]);
  const [hubBatches, setHubBatches] = useState<LeadsHubBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [hubLoading, setHubLoading] = useState(true);
  const [name, setName] = useState("");
  const [csv, setCsv] = useState("");
  const [selectedHubIds, setSelectedHubIds] = useState<string[]>([]);
  const [status, setStatus] = useState<{ msg: string; err?: boolean }>({ msg: "" });
  const [submitting, setSubmitting] = useState(false);
  const [importingHub, setImportingHub] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/sales/batches", { credentials: "same-origin" });
    if (!r.ok) return;
    const j = (await r.json()) as { batches: BatchMeta[] };
    setBatches(j.batches);
    setLoading(false);
  }, []);

  const loadHubBatches = useCallback(async () => {
    try {
      const r = await fetch("/api/leads-hub/batches", { credentials: "same-origin" });
      if (!r.ok) return;
      const j = (await r.json()) as { batches: LeadsHubBatch[] };
      const next = j.batches || [];
      setHubBatches(next);
      setSelectedHubIds((current) => current.filter((id) => next.some((b) => b.id === id)));
    } finally {
      setHubLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadHubBatches();
  }, [loadHubBatches]);

  const selectedHubBatches = useMemo(
    () => hubBatches.filter((b) => selectedHubIds.includes(b.id)),
    [hubBatches, selectedHubIds],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ msg: "" });
    if (!name.trim() || !csv.trim()) {
      setStatus({ msg: "Name and CSV are required.", err: true });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/sales/batches", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), csv }),
      });
      const j = await r.json();
      if (!r.ok) {
        setStatus({ msg: j.error ?? "Upload failed", err: true });
        return;
      }
      setStatus({ msg: `Created ${j.batch.name} (${j.batch.lead_count} leads).` });
      setName("");
      setCsv("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function importFromLeadsHub(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ msg: "" });
    if (!selectedHubIds.length) {
      setStatus({ msg: "Choose one or more Leads Hub batches.", err: true });
      return;
    }
    setImportingHub(true);
    try {
      const r = await fetch("/api/sales/batches/from-leads-hub", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceBatchIds: selectedHubIds }),
      });
      const j = await r.json();
      if (!r.ok) {
        setStatus({ msg: j.error ?? "Import failed", err: true });
        return;
      }
      setStatus({
        msg: `Imported ${j.batches.length} batch${j.batches.length === 1 ? "" : "es"} from Leads Hub.`,
      });
      setSelectedHubIds([]);
      await load();
    } finally {
      setImportingHub(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(String(reader.result ?? ""));
      if (!name) setName(f.name.replace(/\.csv$/i, ""));
    };
    reader.readAsText(f);
  }

  async function onRemove(id: string) {
    const target = batches.find((b) => b.id === id);
    if (!confirm(`Remove "${target?.name ?? "this batch"}"?`)) return;
    const r = await fetch(`/api/sales/batches?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setStatus({ msg: (j as { error?: string }).error ?? "Failed to remove.", err: true });
      return;
    }
    setStatus({ msg: "Removed." });
    await load();
  }

  function toggleHubBatch(id: string) {
    setSelectedHubIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function selectAllHubBatches() {
    setSelectedHubIds(hubBatches.map((b) => b.id));
  }

  function clearHubSelection() {
    setSelectedHubIds([]);
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold tracking-tight">Import from Leads Hub</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Pick one or more Leads Hub batches. The Sales batch names stay locked to the original Leads Hub names.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllHubBatches}
            disabled={hubLoading || !hubBatches.length}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearHubSelection}
            disabled={!selectedHubIds.length}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Clear selection
          </button>
        </div>
        <form onSubmit={importFromLeadsHub} className="mt-4 space-y-3">
          {hubLoading ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              Loading Leads Hub batches...
            </div>
          ) : hubBatches.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              No Leads Hub batches yet.
            </div>
          ) : (
            <div className="grid gap-2">
              {hubBatches.map((b) => {
                const checked = selectedHubIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      checked
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900/40"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHubBatch(b.id)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400/40"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {b.name}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {b.leadCount} leads · {b.fileName}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <button
            type="submit"
            disabled={importingHub || !selectedHubIds.length}
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {importingHub
              ? "Importing…"
              : `Import ${selectedHubIds.length || ""} selected batch${selectedHubIds.length === 1 ? "" : "es"}`.trim()}
          </button>
          {selectedHubBatches.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Names stay locked to: {selectedHubBatches.map((b) => b.name).join(", ")}
            </p>
          )}
        </form>
      </section>

      <section>
        <h2 className="text-base font-semibold tracking-tight">Upload batch</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Paste a CSV. First row = column names (e.g.{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">First Name,Last Name,Phone,Email,Brokerage,City</code>).
          All other rows = leads.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Batch name (e.g. 2026-05-12_batch_01)"
            required
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
          />
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="Paste CSV here…"
            rows={8}
            required
            className="w-full resize-y rounded-md border border-zinc-300 bg-white p-3 font-mono text-xs focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
          />
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Choose .csv file
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? "Uploading…" : "Create batch"}
            </button>
          </div>
        </form>
        {status.msg && (
          <p
            className={`mt-3 text-xs ${
              status.err ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {status.msg}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold tracking-tight">Batches</h2>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading…</p>
        ) : !batches.length ? (
          <p className="mt-2 text-sm text-zinc-500">No batches uploaded yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {batches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {b.name}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    {b.lead_count} leads · {new Date(b.created_at).toISOString().slice(0, 10)} · cols: {b.columns.join(", ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(b.id)}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:border-rose-400 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-500 dark:hover:text-rose-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
