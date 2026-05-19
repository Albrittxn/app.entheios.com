"use client";

import { useState, useMemo, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ScriptFolder, Template } from "@/lib/types";
import { useLocalState } from "@/lib/local-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ScriptsView({
  folders: initialFolders,
  templates: initialTemplates,
}: {
  folders: ScriptFolder[];
  templates: Template[];
}) {
  // localStorage-backed so folders persist across reloads and stay in sync
  // with the Campaign Builder. Clean slate — starts empty; the bumped key
  // suffixes supersede any cached demo data.
  const [folders, setFolders] = useLocalState<ScriptFolder[]>(
    "folders-v2",
    initialFolders,
  );
  const [templates] = useLocalState<Template[]>("templates-v3", initialTemplates);
  const [expanded, setExpanded] = useState<string | null>(initialFolders[0]?.id ?? null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  function toggleTemplate(id: string) {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const byFolder = useMemo(() => {
    const m = new Map<string, Template[]>();
    for (const t of templates) {
      const arr = m.get(t.folderId) ?? [];
      arr.push(t);
      m.set(t.folderId, arr);
    }
    return m;
  }, [templates]);

  function startCreate() {
    setCreateError(null);
    setNewName("");
    setNewDescription("");
    setCreating(true);
  }

  function cancelCreate() {
    setCreating(false);
    setCreateError(null);
  }

  function submitCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setCreateError("Name is required.");
      return;
    }
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setCreateError("A folder with that name already exists.");
      return;
    }
    const folder: ScriptFolder = {
      id: `folder_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      description: newDescription.trim(),
      templateCount: 0,
      lastEditedAt: new Date().toISOString(),
    };
    setFolders((prev) => [folder, ...prev]);
    setExpanded(folder.id);
    setCreating(false);
  }

  return (
    <section>
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scripts</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Folders are bundles of SMS templates. Campaigns rotate through
            every template in their assigned folder, one variant per recipient.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="hidden h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 sm:inline-flex"
        >
          + New folder
        </button>
      </header>

      <AnimatePresence initial={false}>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 overflow-hidden"
          >
            <form
              onSubmit={submitCreate}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                New folder
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr]">
                <div className="space-y-1.5">
                  <Label htmlFor="new-folder-name" className="text-zinc-900 dark:text-zinc-100">
                    Name
                  </Label>
                  <Input
                    id="new-folder-name"
                    type="text"
                    placeholder="e.g. TX · Compass"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    maxLength={64}
                    className="border-zinc-300 bg-white focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-zinc-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-folder-description"
                    className="text-zinc-900 dark:text-zinc-100"
                  >
                    Description{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="new-folder-description"
                    type="text"
                    placeholder="What this folder is for"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    maxLength={140}
                    className="border-zinc-300 bg-white focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-zinc-400"
                  />
                </div>
              </div>
              {createError && (
                <p className="mt-3 text-sm text-rose-700 dark:text-rose-400" role="alert">
                  {createError}
                </p>
              )}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelCreate}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={!newName.trim()}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Create folder
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {folders.length === 0 && !creating && (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-400 dark:text-zinc-500"
              aria-hidden="true"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            No script folders yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            Folders bundle SMS templates that campaigns rotate through. Create your first folder to get started.
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-4 inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + New folder
          </button>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {folders.map((f) => {
            const ts = byFolder.get(f.id) ?? [];
            const isOpen = expanded === f.id;
            return (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : f.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {f.name}
                      </h2>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {f.templateCount} {f.templateCount === 1 ? "template" : "templates"}
                      </span>
                    </div>
                    {f.description && (
                      <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {f.description}
                      </p>
                    )}
                    <div className="mt-1 font-mono text-[11px] text-zinc-400 dark:text-zinc-600">
                      last edited {timeAgo(f.lastEditedAt)}
                    </div>
                  </div>
                  <Chevron open={isOpen} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800"
                    >
                      {ts.length === 0 ? (
                        <div className="px-5 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                          No templates in this folder yet.
                        </div>
                      ) : (
                        <div className="max-h-[420px] overflow-y-auto">
                          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                            {ts.map((t, i) => {
                              const isTplOpen = expandedTemplates.has(t.id);
                              return (
                                <li key={t.id}>
                                  <button
                                    type="button"
                                    onClick={() => toggleTemplate(t.id)}
                                    aria-expanded={isTplOpen}
                                    className="flex w-full items-center gap-3 px-5 py-1.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                  >
                                    <span className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-400 dark:text-zinc-600">
                                      {i + 1}
                                    </span>
                                    <span
                                      className={cn(
                                        "min-w-0 flex-1 font-mono text-[12px] text-zinc-700 dark:text-zinc-300",
                                        !isTplOpen && "truncate",
                                      )}
                                    >
                                      {isTplOpen ? (
                                        <SpintaxText body={t.body} />
                                      ) : (
                                        t.body
                                      )}
                                    </span>
                                    <span
                                      className={cn(
                                        "shrink-0 font-mono text-[10px] tabular-nums",
                                        t.charsWorst > 160
                                          ? "text-rose-700 dark:text-rose-400"
                                          : t.charsWorst > 155
                                            ? "text-amber-700 dark:text-amber-400"
                                            : "text-zinc-500 dark:text-zinc-500",
                                      )}
                                      title={`${t.chars} typical, ${t.charsWorst} worst case`}
                                    >
                                      {t.charsWorst}/160
                                    </span>
                                    {t.sent > 0 && (
                                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-emerald-700 dark:text-emerald-400">
                                        {pct(t.replyRate)}
                                      </span>
                                    )}
                                    <Chevron open={isTplOpen} size="sm" />
                                  </button>

                                  <AnimatePresence initial={false}>
                                    {isTplOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{
                                          duration: 0.18,
                                          ease: [0.22, 1, 0.36, 1],
                                        }}
                                        className="overflow-hidden bg-zinc-50/60 dark:bg-zinc-900/40"
                                      >
                                        <div className="flex items-center gap-4 px-5 py-2 font-mono text-[11px]">
                                          <span className="text-zinc-500 dark:text-zinc-500">
                                            {t.variants}{" "}
                                            {t.variants === 1 ? "variant" : "variants"}
                                          </span>
                                          {t.sent > 0 ? (
                                            <>
                                              <span className="text-zinc-500 dark:text-zinc-500">
                                                {t.sent.toLocaleString()} sent
                                              </span>
                                              <span className="text-emerald-700 dark:text-emerald-400">
                                                {pct(t.replyRate)} reply
                                              </span>
                                              <span
                                                className={cn(
                                                  t.optOutRate >= 0.03
                                                    ? "text-amber-700 dark:text-amber-400"
                                                    : "text-zinc-500 dark:text-zinc-500",
                                                )}
                                              >
                                                {pct(t.optOutRate)} opt-out
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-zinc-400 dark:text-zinc-600">
                                              not yet sent
                                            </span>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      <div className="border-t border-zinc-200 px-5 py-2.5 dark:border-zinc-800">
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed text-xs font-medium text-zinc-500 dark:text-zinc-400"
                          title="Template editor coming soon"
                        >
                          + Add template to folder
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {folders.length > 0 && (
        <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-600">
          Folder + template changes are local-only until a shared script store is wired up.
        </p>
      )}
    </section>
  );
}

// Highlight {spintax|alternations} and {{merge.variables}} so the structure
// is readable at a glance.
function SpintaxText({ body }: { body: string }) {
  const tokens: { type: "text" | "spintax" | "var"; value: string }[] = [];
  const re = /(\{\{[^}]+\}\}|\{[^{}]+\})/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) tokens.push({ type: "text", value: body.slice(last, m.index) });
    const v = m[0];
    if (v.startsWith("{{")) tokens.push({ type: "var", value: v });
    else tokens.push({ type: "spintax", value: v });
    last = m.index + v.length;
  }
  if (last < body.length) tokens.push({ type: "text", value: body.slice(last) });

  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === "spintax") {
          return (
            <span
              key={i}
              className="rounded bg-blue-100 px-1 text-blue-900 dark:bg-blue-500/15 dark:text-blue-200"
            >
              {t.value}
            </span>
          );
        }
        if (t.type === "var") {
          return (
            <span
              key={i}
              className="rounded bg-emerald-100 px-1 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200"
            >
              {t.value}
            </span>
          );
        }
        return <span key={i}>{t.value}</span>;
      })}
    </>
  );
}

function Chevron({ open, size = "md" }: { open: boolean; size?: "sm" | "md" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "shrink-0 text-zinc-400 transition-transform",
        size === "sm" ? "h-3 w-3" : "h-4 w-4",
        open && "rotate-180",
      )}
      aria-hidden="true"
    >
      <path d="M5 7l5 5 5-5" />
    </svg>
  );
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
