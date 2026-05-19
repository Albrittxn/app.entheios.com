"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function formatRelative(ts: number): string {
  if (!ts) return "Empty — start typing";
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 5) return "Saved · just now";
  if (d < 60) return `Saved · ${d}s ago`;
  if (d < 3600) return `Saved · ${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `Saved · ${Math.floor(d / 3600)}h ago`;
  return `Saved · ${new Date(ts).toISOString().slice(0, 10)}`;
}

export function NotesEditor({ hub }: { hub: "sales" | "closing" }) {
  const [value, setValue] = useState("");
  const [updatedAt, setUpdatedAt] = useState(0);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/notes?hub=${hub}`, { credentials: "same-origin" });
        const data = (await r.json()) as { body?: string; updated_at?: number };
        if (cancelled) return;
        setValue(data.body ?? "");
        setUpdatedAt(data.updated_at ?? 0);
        loadedRef.current = true;
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hub]);

  const save = useCallback(
    async (nextBody: string) => {
      setStatus("saving");
      try {
        const r = await fetch(`/api/notes?hub=${hub}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ body: nextBody }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setStatus("error");
          setErrorMsg((j as { error?: string }).error ?? "Save failed");
          return;
        }
        const j = (await r.json()) as { updated_at: number };
        setUpdatedAt(j.updated_at);
        setStatus("saved");
        setErrorMsg("");
      } catch (e) {
        setStatus("error");
        setErrorMsg("Save failed");
      }
    },
    [hub],
  );

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setValue(next);
    if (!loadedRef.current) return;
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      save(next);
    }, 800);
  }

  function onBlur() {
    if (!loadedRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      save(value);
    }
  }

  // Save on unload
  useEffect(() => {
    function flush() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        // Fire-and-forget — page is going away
        navigator.sendBeacon?.(
          `/api/notes?hub=${hub}`,
          new Blob([JSON.stringify({ body: value })], { type: "application/json" }),
        );
      }
    }
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [hub, value]);

  const statusText =
    status === "saving"
      ? "Saving…"
      : status === "error"
      ? `Failed: ${errorMsg}`
      : formatRelative(updatedAt);
  const statusClass =
    status === "saving"
      ? "text-zinc-500 dark:text-zinc-400"
      : status === "error"
      ? "text-rose-600 dark:text-rose-400"
      : "text-emerald-700 dark:text-emerald-400";

  return (
    <div>
      <textarea
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="Write anything — call observations, follow-ups, ideas, contacts to revisit…"
        className="min-h-[420px] w-full resize-y rounded-lg border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
      />
      <p className={`mt-2 font-mono text-xs ${statusClass}`}>{statusText}</p>
    </div>
  );
}
