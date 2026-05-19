"use client";

// Admin editor for the Investing hub. Lists every user with Investing access
// and lets admin set their invested amount + projected growth percentages
// for 1w / 4w / 3mo windows. Each row saves independently.

import { useEffect, useState } from "react";

type Row = {
  email: string;
  name: string | null;
  invested: number;
  growth1w: number;
  growth4w: number;
  growth3mo: number;
  updatedAt: string | null;
  hasRecord: boolean;
};

type Draft = {
  invested: string;
  growth1w: string;
  growth4w: string;
  growth3mo: string;
};

const inputCls =
  "h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm tabular-nums focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";

const labelCls =
  "block text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400";

const btnPrimary =
  "inline-flex h-9 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

const btnGhost =
  "rounded-md border border-zinc-300 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100";

function toDraft(r: Row): Draft {
  return {
    invested: String(r.invested),
    growth1w: String(r.growth1w),
    growth4w: String(r.growth4w),
    growth3mo: String(r.growth3mo),
  };
}

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function InvestmentsEditor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ msg: string; err?: boolean }>({ msg: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/investing", { credentials: "same-origin" });
    if (r.ok) {
      const j = (await r.json()) as { rows: Row[] };
      setRows(j.rows);
      setDrafts(Object.fromEntries(j.rows.map((row) => [row.email, toDraft(row)])));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateDraft(email: string, key: keyof Draft, value: string) {
    setDrafts((d) => ({ ...d, [email]: { ...d[email], [key]: value } }));
  }

  async function save(row: Row) {
    const d = drafts[row.email];
    if (!d) return;
    setBusy(row.email);
    setStatus({ msg: "" });
    const r = await fetch("/api/admin/investing", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: row.email,
        invested: d.invested === "" ? 0 : Number(d.invested),
        growth1w: d.growth1w === "" ? 0 : Number(d.growth1w),
        growth4w: d.growth4w === "" ? 0 : Number(d.growth4w),
        growth3mo: d.growth3mo === "" ? 0 : Number(d.growth3mo),
      }),
    });
    setBusy(null);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setStatus({ msg: j.error ?? "Failed to save", err: true });
      return;
    }
    setStatus({ msg: `Saved ${row.name || row.email}.` });
    load();
  }

  async function clearRecord(row: Row) {
    if (!row.hasRecord) return;
    if (!confirm(`Clear investment record for ${row.email}?`)) return;
    setBusy(row.email);
    const r = await fetch(`/api/admin/investing?email=${encodeURIComponent(row.email)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setBusy(null);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setStatus({ msg: j.error ?? "Failed", err: true });
      return;
    }
    setStatus({ msg: `Cleared ${row.email}.` });
    load();
  }

  function isDirty(row: Row): boolean {
    const d = drafts[row.email];
    if (!d) return false;
    return (
      Number(d.invested || 0) !== row.invested ||
      Number(d.growth1w || 0) !== row.growth1w ||
      Number(d.growth4w || 0) !== row.growth4w ||
      Number(d.growth3mo || 0) !== row.growth3mo
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Investment records</h2>
        {status.msg && (
          <p
            className={`text-xs ${
              status.err
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {status.msg}
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Set how much each user has invested in Entheios and the projected growth
        % they see for 1 week, 4 weeks, and 3 months.
      </p>

      <div className="mt-4 space-y-3">
        {loading && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
        )}
        {!loading && rows.length === 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No users in Investing yet — add one above to get started.
          </p>
        )}
        {rows.map((row) => {
          const d = drafts[row.email] ?? toDraft(row);
          const rowBusy = busy === row.email;
          const dirty = isDirty(row);
          return (
            <div
              key={row.email}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {row.name || row.email.split("@")[0]}
                  </div>
                  <div className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    {row.email}
                    {row.hasRecord && row.updatedAt && (
                      <> · updated {row.updatedAt.slice(0, 10)}</>
                    )}
                    {!row.hasRecord && <> · no record yet</>}
                  </div>
                </div>
                <div className="text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  <div className="text-[10px] uppercase tracking-wider">On file</div>
                  <div className="text-zinc-900 dark:text-zinc-100">
                    {fmtUSD(row.invested)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className={labelCls}>Invested ($)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className={`${inputCls} mt-1`}
                    value={d.invested}
                    onChange={(e) => updateDraft(row.email, "invested", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>1 wk (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className={`${inputCls} mt-1`}
                    value={d.growth1w}
                    onChange={(e) => updateDraft(row.email, "growth1w", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>4 wk (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className={`${inputCls} mt-1`}
                    value={d.growth4w}
                    onChange={(e) => updateDraft(row.email, "growth4w", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>3 mo (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className={`${inputCls} mt-1`}
                    value={d.growth3mo}
                    onChange={(e) => updateDraft(row.email, "growth3mo", e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={rowBusy || !dirty}
                  onClick={() => save(row)}
                  className={btnPrimary}
                >
                  {rowBusy ? "Saving…" : dirty ? "Save changes" : "Saved"}
                </button>
                {row.hasRecord && (
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => clearRecord(row)}
                    className={btnGhost}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
