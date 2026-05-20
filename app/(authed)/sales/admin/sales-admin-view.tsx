"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BatchMeta = {
  id: string;
  name: string;
  folder?: string;
  source_batch_id?: string;
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
  folder: string;
};

export function SalesAdminView() {
  const [batches, setBatches] = useState<BatchMeta[]>([]);
  const [hubBatches, setHubBatches] = useState<LeadsHubBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [hubLoading, setHubLoading] = useState(true);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [csv, setCsv] = useState("");
  const [selectedHubIds, setSelectedHubIds] = useState<string[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [folderDrafts, setFolderDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ msg: string; err?: boolean }>({ msg: "" });
  const [submitting, setSubmitting] = useState(false);
  const [importingHub, setImportingHub] = useState(false);
  const [removingBatchIds, setRemovingBatchIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const optimisticFolderByIdRef = useRef<Record<string, string>>({});
  const optimisticDeletedBatchIdsRef = useRef<Set<string>>(new Set());
  const optimisticCreatedBatchesRef = useRef<Record<string, BatchMeta>>({});

  async function readJsonResponse(r: Response): Promise<Record<string, unknown>> {
    const text = await r.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { error: text };
    }
  }

  const load = useCallback(async () => {
    const r = await fetch("/api/sales/batches", { credentials: "same-origin" });
    if (!r.ok) return;
    const j = (await r.json()) as { batches: BatchMeta[] };
    const serverBatches = j.batches.map((batch) => ({
      ...batch,
      folder: optimisticFolderByIdRef.current[batch.id] ?? batch.folder,
    }));
    const serverIds = new Set(serverBatches.map((batch) => batch.id));
    for (const batch of serverBatches) {
      if (optimisticDeletedBatchIdsRef.current.has(batch.id)) {
        optimisticDeletedBatchIdsRef.current.delete(batch.id);
      }
      if (optimisticCreatedBatchesRef.current[batch.id]) {
        delete optimisticCreatedBatchesRef.current[batch.id];
      }
      if (optimisticFolderByIdRef.current[batch.id] === batch.folder) {
        delete optimisticFolderByIdRef.current[batch.id];
      }
    }
    setBatches([
      ...serverBatches.filter((batch) => !optimisticDeletedBatchIdsRef.current.has(batch.id)),
      ...Object.values(optimisticCreatedBatchesRef.current).filter((batch) => !serverIds.has(batch.id)),
    ]);
    setSelectedBatchIds((current) =>
      current.filter((id) => j.batches.some((batch) => batch.id === id)),
    );
    setFolderDrafts((current) => {
      const next = { ...current };
      for (const batch of j.batches) {
        if (next[batch.id] === undefined) next[batch.id] = batch.folder ?? "";
      }
      return next;
    });
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

  const importedHubIds = useMemo(
    () => new Set(batches.map((b) => b.source_batch_id).filter(Boolean)),
    [batches],
  );

  const importedNames = useMemo(
    () => new Set(batches.map((b) => b.name.trim().toLowerCase()).filter(Boolean)),
    [batches],
  );

  const availableHubBatches = useMemo(
    () =>
      hubBatches.filter(
        (batch) =>
          !importedHubIds.has(batch.id) &&
          !importedNames.has(batch.name.trim().toLowerCase()),
      ),
    [hubBatches, importedHubIds, importedNames],
  );

  const selectedHubBatches = useMemo(
    () => availableHubBatches.filter((b) => selectedHubIds.includes(b.id)),
    [availableHubBatches, selectedHubIds],
  );

  const availableHubFolders = useMemo(() => {
    const grouped = new Map<string, LeadsHubBatch[]>();
    for (const batch of availableHubBatches) {
      const folderName = batch.folder?.trim() || "";
      if (!folderName) continue;
      const current = grouped.get(folderName) ?? [];
      current.push(batch);
      grouped.set(folderName, current);
    }

    return [...grouped.entries()]
      .map(([folderName, items]) => ({
        folderName,
        items: items.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }),
        ),
      }))
      .sort((a, b) =>
        a.folderName.localeCompare(b.folderName, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      );
  }, [availableHubBatches]);

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
        body: JSON.stringify({ name: name.trim(), folder: folder.trim(), csv }),
      });
      const j = await readJsonResponse(r);
      if (!r.ok) {
        setStatus({ msg: String(j.error ?? "Upload failed"), err: true });
        return;
      }
      const batch = j.batch as { name?: string; lead_count?: number } | undefined;
      const nextBatch = j.batch as BatchMeta | undefined;
      if (nextBatch?.id) {
        optimisticDeletedBatchIdsRef.current.delete(nextBatch.id);
        optimisticCreatedBatchesRef.current[nextBatch.id] = nextBatch;
        setBatches((current) => {
          const next = current.filter((item) => item.id !== nextBatch.id);
          return [nextBatch, ...next];
        });
      }
      setStatus({ msg: `Created ${batch?.name ?? name.trim()} (${batch?.lead_count ?? 0} leads).` });
      setName("");
      setFolder("");
      setCsv("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setStatus({
        msg: error instanceof Error ? error.message : "Upload failed.",
        err: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function importFromLeadsHub(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHubIds.length) {
      setStatus({ msg: "Choose one or more Leads Hub batches.", err: true });
      return;
    }
    setStatus({ msg: `Importing ${selectedHubIds.length} batch${selectedHubIds.length === 1 ? "" : "es"}...` });
    setImportingHub(true);
    try {
      const r = await fetch("/api/sales/batches/from-leads-hub", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceBatchIds: selectedHubIds }),
      });
      const j = await readJsonResponse(r);
      if (!r.ok) {
        setStatus({ msg: String(j.error ?? "Import failed"), err: true });
        return;
      }
      const imported = Array.isArray(j.batches) ? j.batches.length : 0;
      const importedBatches = Array.isArray(j.batches) ? (j.batches as BatchMeta[]) : [];
      for (const batch of importedBatches) {
        optimisticDeletedBatchIdsRef.current.delete(batch.id);
        optimisticCreatedBatchesRef.current[batch.id] = batch;
      }
      if (importedBatches.length) {
        setBatches((current) => {
          const next = current.filter(
            (item) => !importedBatches.some((importedBatch) => importedBatch.id === item.id),
          );
          return [...importedBatches, ...next];
        });
      }
      setStatus({
        msg: `Imported ${imported} batch${imported === 1 ? "" : "es"} from Leads Hub.`,
      });
      setSelectedHubIds([]);
      setHubBatches((current) =>
        current.filter((batch) => !selectedHubIds.includes(batch.id)),
      );
      await loadHubBatches();
    } catch (error) {
      setStatus({
        msg: error instanceof Error ? error.message : "Import failed.",
        err: true,
      });
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
    await removeBatches([id]);
  }

  function toggleHubBatch(id: string) {
    setSelectedHubIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function selectAllHubBatches() {
    setSelectedHubIds(availableHubBatches.map((b) => b.id));
  }

  function clearHubSelection() {
    setSelectedHubIds([]);
  }

  function folderIsFullySelected(folderName: string) {
    const folder = availableHubFolders.find((entry) => entry.folderName === folderName);
    return Boolean(folder && folder.items.every((item) => selectedHubIds.includes(item.id)));
  }

  function toggleHubFolder(folderName: string) {
    const folder = availableHubFolders.find((entry) => entry.folderName === folderName);
    if (!folder) return;
    const folderIds = folder.items.map((item) => item.id);
    const everySelected = folderIds.every((id) => selectedHubIds.includes(id));

    setSelectedHubIds((current) => {
      if (everySelected) {
        return current.filter((id) => !folderIds.includes(id));
      }
      return [...new Set([...current, ...folderIds])];
    });
  }

  function toggleBatchSelection(id: string) {
    setSelectedBatchIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function selectAllBatches() {
    setSelectedBatchIds(sortedBatches.map((batch) => batch.id));
  }

  function clearBatchSelection() {
    setSelectedBatchIds([]);
  }

  async function removeBatches(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return;
    const targets = batches.filter((batch) => uniqueIds.includes(batch.id));
    const label =
      uniqueIds.length === 1
        ? `Remove "${targets[0]?.name ?? "this batch"}"?`
        : `Remove ${uniqueIds.length} selected batches?`;
    if (!confirm(label)) return;

    setRemovingBatchIds(uniqueIds);
    const previousBatches = batches;
    const previousSelection = selectedBatchIds;
    for (const id of uniqueIds) {
      optimisticDeletedBatchIdsRef.current.add(id);
      delete optimisticCreatedBatchesRef.current[id];
    }
    setBatches((current) => current.filter((batch) => !uniqueIds.includes(batch.id)));
    setSelectedBatchIds((current) => current.filter((id) => !uniqueIds.includes(id)));

    try {
      const query = uniqueIds.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
      const r = await fetch(`/api/sales/batches?${query}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!r.ok) {
        const j = await readJsonResponse(r);
        setBatches(previousBatches);
        setSelectedBatchIds(previousSelection);
        setStatus({ msg: String(j.error ?? "Failed to remove."), err: true });
        return;
      }

      setStatus({
        msg:
          uniqueIds.length === 1
            ? "Batch removed."
            : `Removed ${uniqueIds.length} batches.`,
      });
    } catch (error) {
      for (const id of uniqueIds) optimisticDeletedBatchIdsRef.current.delete(id);
      setBatches(previousBatches);
      setSelectedBatchIds(previousSelection);
      setStatus({
        msg: error instanceof Error ? error.message : "Failed to remove.",
        err: true,
      });
    } finally {
      setRemovingBatchIds([]);
    }
  }

  async function saveFolder(id: string) {
    const folderValue = (folderDrafts[id] ?? "").trim();
    const previousFolder = batches.find((batch) => batch.id === id)?.folder ?? "";
    optimisticFolderByIdRef.current[id] = folderValue;
    setBatches((current) =>
      current.map((batch) => (batch.id === id ? { ...batch, folder: folderValue } : batch)),
    );
    const r = await fetch("/api/sales/batches", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, folder: folderValue }),
    });
    const j = await readJsonResponse(r);
    if (!r.ok) {
      delete optimisticFolderByIdRef.current[id];
      setBatches((current) =>
        current.map((batch) => (batch.id === id ? { ...batch, folder: previousFolder } : batch)),
      );
      setFolderDrafts((current) => ({ ...current, [id]: previousFolder }));
      setStatus({ msg: String(j.error ?? "Failed to update folder."), err: true });
      return;
    }
    setStatus({ msg: "Folder updated." });
  }

  const sortedBatches = useMemo(
    () =>
      [...batches].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }),
      ),
    [batches],
  );

  const folderOptions = useMemo(() => {
    const fromBatches = batches.map((batch) => batch.folder ?? "");
    const fromHubBatches = hubBatches.map((batch) => batch.folder ?? "");
    return [...new Set([...fromBatches, ...fromHubBatches].map((value) => value.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
  }, [batches, hubBatches]);

  return (
    <div className="space-y-4">
      {status.msg && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            status.err
              ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          {status.msg}
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Import from Leads Hub</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pick batches or whole folders to mirror into Sales.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllHubBatches}
                disabled={hubLoading || !availableHubBatches.length}
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
                Clear
              </button>
            </div>
          </div>
          <form onSubmit={importFromLeadsHub} className="mt-3 space-y-3">
          {availableHubFolders.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                Import folders
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableHubFolders.map((folder) => {
                  const selected = folderIsFullySelected(folder.folderName);
                  const leadCount = folder.items.reduce((sum, item) => sum + item.leadCount, 0);
                  return (
                    <button
                      key={folder.folderName}
                      type="button"
                      onClick={() => toggleHubFolder(folder.folderName)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900/40"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {folder.folderName}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {folder.items.length} batch{folder.items.length === 1 ? "" : "es"} · {leadCount} leads
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {hubLoading ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              Loading Leads Hub batches...
            </div>
          ) : availableHubBatches.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              Everything from Leads Hub is already imported into Sales.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                Import individual batches
              </div>
              <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
              {availableHubBatches.map((b) => {
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
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {b.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {b.leadCount} leads · {b.folder || "Unsorted"} · {b.fileName}
                      </div>
                    </div>
                  </label>
                );
              })}
              </div>
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

        <section className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold tracking-tight">Upload batch</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Paste CSV or choose a file. First row should be your columns.
          </p>
          <form onSubmit={onSubmit} className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Batch name"
                required
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
              />
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
              >
                <option value="">No folder yet</option>
                {folderOptions.map((folderName) => (
                  <option key={folderName} value={folderName}>
                    {folderName}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder="Paste CSV here…"
              rows={5}
              required
              className="w-full resize-y rounded-md border border-zinc-300 bg-white p-3 font-mono text-xs focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                {submitting ? "Uploading..." : "Create batch"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Available batches</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage which batches are available to the sales team.
            </p>
          </div>
        </div>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading…</p>
        ) : !batches.length ? (
          <p className="mt-2 text-sm text-zinc-500">No batches uploaded yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={selectAllBatches}
                disabled={!sortedBatches.length}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-950"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearBatchSelection}
                disabled={!selectedBatchIds.length}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-950"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => void removeBatches(selectedBatchIds)}
                disabled={!selectedBatchIds.length || removingBatchIds.length > 0}
                className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:bg-zinc-950 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                {removingBatchIds.length > 0
                  ? "Removing..."
                  : `Remove ${selectedBatchIds.length || ""} selected`.trim()}
              </button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedBatchIds.length
                  ? `${selectedBatchIds.length} selected`
                  : "Pick one or more batches to remove fast."}
              </span>
            </div>
            <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
              {sortedBatches.map((b) => (
                <div
                  key={b.id}
                  className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-[auto_minmax(0,1fr)_220px_auto]"
                >
                  <label className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={selectedBatchIds.includes(b.id)}
                      onChange={() => toggleBatchSelection(b.id)}
                      disabled={removingBatchIds.includes(b.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400/40"
                      aria-label={`Select ${b.name}`}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {b.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {b.folder || "Unsorted"} · {b.lead_count} leads · {new Date(b.created_at).toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={folderDrafts[b.id] ?? b.folder ?? ""}
                      onChange={(e) =>
                        setFolderDrafts((current) => ({ ...current, [b.id]: e.target.value }))
                      }
                      className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
                    >
                      <option value="">Unsorted</option>
                      {folderOptions.map((folderName) => (
                        <option key={folderName} value={folderName}>
                          {folderName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void saveFolder(b.id)}
                      className="h-9 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Move
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onRemove(b.id)}
                    disabled={removingBatchIds.includes(b.id)}
                    className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  >
                    {removingBatchIds.includes(b.id) ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
