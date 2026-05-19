"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  matchColumns,
  parseSheet,
  REQUIRED_COLUMNS,
  type ColumnMap,
} from "@/lib/csv";
import type { Campaign, Lead, LeadGroup, ScriptFolder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ParsedFile = {
  name: string;
  rowCount: number;
  headers: string[];
  preview: string[][];
  map: ColumnMap;
  missing: string[];
};

type SourceMode = "all" | "groups" | "ungrouped" | "upload";

export function CampaignBuilder({
  folders,
  leads,
  groups,
  onCreate,
}: {
  folders: ScriptFolder[];
  leads: Lead[];
  groups: LeadGroup[];
  onCreate: (c: Campaign) => void;
}) {
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState<string>(folders[0]?.id ?? "");
  const [sourceMode, setSourceMode] = useState<SourceMode>("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep the folder picker pointing at a real folder. Handles two cases:
  //  1. Folders hydrate from empty on mount → pick the first one.
  //  2. The currently-selected folder gets deleted on the Scripts tab → fall
  //     back to the first remaining one (or empty if none).
  useEffect(() => {
    if (folders.length === 0) {
      if (folderId !== "") setFolderId("");
      return;
    }
    if (!folderId || !folders.some((f) => f.id === folderId)) {
      setFolderId(folders[0].id);
    }
  }, [folders, folderId]);

  const counts = useMemo(() => {
    let ungrouped = 0;
    const byGroup = new Map<string, number>();
    for (const l of leads) {
      const ids = l.groupIds ?? [];
      if (ids.length === 0) ungrouped++;
      else for (const id of ids) byGroup.set(id, (byGroup.get(id) ?? 0) + 1);
    }
    return { all: leads.length, ungrouped, byGroup };
  }, [leads]);

  const selectedLeadCount = useMemo(() => {
    if (sourceMode === "all") return counts.all;
    if (sourceMode === "ungrouped") return counts.ungrouped;
    if (sourceMode === "groups") {
      if (selectedGroupIds.length === 0) return 0;
      const set = new Set(selectedGroupIds);
      return leads.filter((l) => (l.groupIds ?? []).some((g) => set.has(g))).length;
    }
    return parsed?.rowCount ?? 0;
  }, [sourceMode, selectedGroupIds, leads, counts, parsed]);

  const sourceReady =
    sourceMode === "upload"
      ? !!parsed && parsed.missing.length === 0
      : selectedLeadCount > 0;

  const ready =
    name.trim().length > 0 && !!folderId && sourceReady && folders.length > 0;

  async function handleFile(file: File) {
    setParseError(null);
    try {
      const { headers, rows, rowCount } = await parseSheet(file);
      const { map, missing } = matchColumns(headers);
      setParsed({
        name: file.name,
        rowCount,
        headers,
        preview: rows.slice(0, 5),
        map,
        missing,
      });
    } catch (err) {
      setParseError(
        (err as Error).message ?? "Couldn't read that file. CSV or XLSX only.",
      );
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

  function toggleGroup(id: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function sourceDescription(): string {
    if (sourceMode === "all") return "Master list";
    if (sourceMode === "ungrouped") return "Ungrouped leads";
    if (sourceMode === "groups") {
      const picked = groups.filter((g) => selectedGroupIds.includes(g.id));
      if (!picked.length) return "No groups picked";
      return picked.map((g) => g.name).join(" · ");
    }
    return parsed?.name ?? "Upload";
  }

  function onSubmit() {
    if (!ready) return;
    const c: Campaign = {
      id: `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      scriptFolderId: folderId,
      status: "paused",
      leadCount: selectedLeadCount,
      sentToday: 0,
      replies: 0,
      optOuts: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    onCreate(c);
    setName("");
    setParsed(null);
    setParseError(null);
    setSelectedGroupIds([]);
    setSourceMode("all");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Campaign builder
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Pick a script folder + a lead source, then hit Create.
        </p>
      </div>

      <div className="space-y-6 p-6">
        {/* Row 1: Name + Folder */}
        <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name" className="text-zinc-900 dark:text-zinc-100">
              Campaign name
            </Label>
            <Input
              id="campaign-name"
              type="text"
              placeholder="e.g. TX · Compass · Q3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-zinc-300 bg-white focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-zinc-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-folder" className="text-zinc-900 dark:text-zinc-100">
              Script folder
            </Label>
            {folders.length === 0 ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                No script folders yet — create one on the Scripts tab first.
              </div>
            ) : (
              <select
                id="campaign-folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-zinc-400"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.templateCount}{" "}
                    {f.templateCount === 1 ? "template" : "templates"})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Row 2: Lead source */}
        <div>
          <Label className="text-zinc-900 dark:text-zinc-100">Lead source</Label>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SourceCard
              active={sourceMode === "all"}
              onClick={() => setSourceMode("all")}
              title="All leads"
              count={counts.all}
              description="Everyone in the master list"
            />
            <SourceCard
              active={sourceMode === "groups"}
              onClick={() => setSourceMode("groups")}
              title="Specific groups"
              count={
                sourceMode === "groups" && selectedGroupIds.length
                  ? selectedLeadCount
                  : undefined
              }
              description={
                groups.length === 0
                  ? "Create groups on the Leads tab"
                  : selectedGroupIds.length === 0
                    ? "Pick one or more below"
                    : `${selectedGroupIds.length} ${
                        selectedGroupIds.length === 1 ? "group" : "groups"
                      } selected`
              }
              disabled={groups.length === 0}
            />
            <SourceCard
              active={sourceMode === "ungrouped"}
              onClick={() => setSourceMode("ungrouped")}
              title="Ungrouped only"
              count={counts.ungrouped}
              description="Leads not assigned to a group"
            />
            <SourceCard
              active={sourceMode === "upload"}
              onClick={() => setSourceMode("upload")}
              title="Upload CSV/XLSX"
              count={parsed?.rowCount}
              description={
                parsed
                  ? parsed.missing.length === 0
                    ? `${parsed.rowCount} rows ready`
                    : `Missing: ${parsed.missing.join(", ")}`
                  : "One-off list (not added to master)"
              }
            />
          </div>

          {/* Specific groups picker */}
          <AnimatePresence initial={false}>
            {sourceMode === "groups" && groups.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-wrap gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  {groups.map((g) => {
                    const on = selectedGroupIds.includes(g.id);
                    const c = counts.byGroup.get(g.id) ?? 0;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGroup(g.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          on
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                            : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
                        )}
                      >
                        {g.name}
                        <span
                          className={cn(
                            "font-mono text-[10px]",
                            on
                              ? "text-zinc-300 dark:text-zinc-600"
                              : "text-zinc-400 dark:text-zinc-500",
                          )}
                        >
                          {c}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload zone */}
          <AnimatePresence initial={false}>
            {sourceMode === "upload" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      "flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
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
                    {!parsed ? (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Drop CSV / XLSX here or click to upload
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-mono text-sm text-zinc-900 dark:text-zinc-100">
                              {parsed.name}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {parsed.rowCount.toLocaleString()} rows ·{" "}
                              {parsed.missing.length === 0 ? (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  all required columns matched
                                </span>
                              ) : (
                                <span className="text-rose-700 dark:text-rose-400">
                                  missing: {parsed.missing.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setParsed(null);
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

                  {parseError && (
                    <p className="text-sm text-rose-700 dark:text-rose-400" role="alert">
                      {parseError}
                    </p>
                  )}

                  {parsed && (
                    <ul className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">
                      {REQUIRED_COLUMNS.map((c) => {
                        const ok = parsed.map[c.key] !== null;
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
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {ready
            ? `Ready · ${selectedLeadCount.toLocaleString()} leads → ${
                folders.find((f) => f.id === folderId)?.name ?? "—"
              } · source: ${sourceDescription()}`
            : "Fill in name, pick a folder + lead source."}
        </span>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!ready}
          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Create campaign
        </Button>
      </div>
    </div>
  );
}

function SourceCard({
  active,
  onClick,
  title,
  count,
  description,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  count?: number;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50",
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-600",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="flex w-full items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        {typeof count === "number" && (
          <span
            className={cn(
              "font-mono text-xs",
              active
                ? "text-zinc-300 dark:text-zinc-600"
                : "text-zinc-500 dark:text-zinc-500",
            )}
          >
            {count.toLocaleString()}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[11px]",
          active
            ? "text-zinc-300 dark:text-zinc-600"
            : "text-zinc-500 dark:text-zinc-500",
        )}
      >
        {description}
      </span>
    </button>
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
