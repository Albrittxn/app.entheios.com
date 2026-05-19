"use client";

// Hub-scoped user management — shown inside each hub's Admin page.
//
// Add an email to grant this hub access. Per existing user you can edit their
// name, re-send the sign-in email, add them to other hubs, or remove them
// from this hub. Hub membership lives in one shared allowlist, so adding a
// user to another hub here shows up in that hub's Admin tab automatically.

import { useEffect, useState } from "react";
import { HUBS, HUB_ORDER, type HubId } from "@/lib/hubs";

type HubUser = {
  email: string;
  name?: string;
  added_at: string;
  hubs: HubId[];
  isAdmin: boolean;
  profilePictureUrl?: string;
};

function splitName(
  name: string | undefined,
  email: string,
): { first: string; last: string } {
  const n = (name ?? "").trim();
  if (!n) return { first: email.split("@")[0], last: "" };
  const parts = n.split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

const inputCls =
  "h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";

const rowBtnCls =
  "rounded-md border border-zinc-300 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100";

export function HubUsersPanel({ hub, label }: { hub: HubId; label: string }) {
  const [users, setUsers] = useState<HubUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-user form.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [busy, setBusy] = useState(false);

  // Per-row state.
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");

  const [status, setStatus] = useState<{ msg: string; err?: boolean }>({ msg: "" });

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/admin/hub-users/list?hub=${hub}`, {
      credentials: "same-origin",
    });
    if (r.ok) {
      const j = (await r.json()) as { users: HubUser[] };
      setUsers(j.users);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    const email = emailInput.trim();
    const first = firstName.trim();
    if (!email || !first) return;
    setBusy(true);
    setStatus({ msg: "" });
    const r = await fetch("/api/admin/hub-users", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        firstName: first,
        lastName: lastName.trim(),
        hub,
        sendWelcome,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setStatus({ msg: j.error ?? "Failed", err: true });
      return;
    }
    const j = (await r.json().catch(() => ({}))) as {
      welcomeSent?: boolean;
      welcomeError?: string;
    };
    const displayName = first.charAt(0).toUpperCase() + first.slice(1);
    let msg = `Added ${displayName} to ${label}.`;
    if (sendWelcome) {
      msg += j.welcomeSent
        ? " Sign-in email sent."
        : ` Sign-in email failed: ${j.welcomeError ?? "unknown error"}.`;
    }
    setStatus({ msg, err: sendWelcome && !j.welcomeSent });
    setFirstName("");
    setLastName("");
    setEmailInput("");
    load();
  }

  async function removeUser(email: string) {
    if (
      !confirm(
        `Remove ${email} from ${label}? They keep access to other hubs they were granted.`,
      )
    )
      return;
    setRowBusy(email);
    const r = await fetch(
      `/api/admin/hub-users?email=${encodeURIComponent(email)}&hub=${hub}`,
      { method: "DELETE", credentials: "same-origin" },
    );
    setRowBusy(null);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setStatus({ msg: j.error ?? "Failed", err: true });
      return;
    }
    setStatus({ msg: `Removed ${email} from ${label}.` });
    load();
  }

  function startEdit(u: HubUser) {
    const { first, last } = splitName(u.name, u.email);
    setEditingEmail(u.email);
    setEditFirst(first);
    setEditLast(last);
  }

  async function saveEdit(u: HubUser) {
    const first = editFirst.trim();
    if (!first) return;
    setRowBusy(u.email);
    // Re-POST with the user's *current* hub — a no-op for hub membership,
    // but it updates their stored display name.
    const r = await fetch("/api/admin/hub-users", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: u.email,
        firstName: first,
        lastName: editLast.trim(),
        hub,
        sendWelcome: false,
      }),
    });
    setRowBusy(null);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setStatus({ msg: j.error ?? "Failed", err: true });
      return;
    }
    setEditingEmail(null);
    setStatus({ msg: `Updated ${first}.` });
    load();
  }

  async function addToHub(u: HubUser, targetHub: HubId) {
    const targetLabel = HUBS[targetHub].label;
    if (
      !confirm(
        `Add ${u.name || u.email} to ${targetLabel}?\n\nThey'll be able to sign in to the ${targetLabel} hub, and they'll show up in the ${targetLabel} Admin tab too.`,
      )
    )
      return;
    const { first, last } = splitName(u.name, u.email);
    setRowBusy(u.email);
    const r = await fetch("/api/admin/hub-users", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: u.email,
        firstName: first,
        lastName: last,
        hub: targetHub,
        sendWelcome: false,
      }),
    });
    setRowBusy(null);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setStatus({ msg: j.error ?? "Failed", err: true });
      return;
    }
    setStatus({ msg: `Added ${u.name || u.email} to ${targetLabel}.` });
    load();
  }

  async function sendSignin(u: HubUser) {
    if (!confirm(`Send a sign-in email to ${u.email}?`)) return;
    const { first } = splitName(u.name, u.email);
    setRowBusy(u.email);
    const r = await fetch("/api/admin/hub-users/send-signin", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: u.email, firstName: first, hub }),
    });
    setRowBusy(null);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setStatus({ msg: j.error ?? "Failed to send", err: true });
      return;
    }
    setStatus({ msg: `Sign-in email sent to ${u.email}.` });
  }

  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight">Users in {label}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Granting a user access here adds them to the allowlist (if new) and lets
        them sign in to {label}.
      </p>

      <form onSubmit={addUser} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <input
            type="email"
            placeholder="someone@example.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            className={`${inputCls} min-w-0 flex-1`}
          />
          <label className="flex shrink-0 select-none items-center gap-2 whitespace-nowrap px-1 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={sendWelcome}
              onChange={(e) => setSendWelcome(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900"
            />
            Send sign-in email
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 shrink-0 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {busy ? "Adding…" : "Grant access"}
          </button>
        </div>
      </form>
      {status.msg && (
        <p
          className={`mt-2 text-xs ${
            status.err
              ? "text-rose-600 dark:text-rose-400"
              : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {status.msg}
        </p>
      )}

      <h3 className="mt-6 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {loading
          ? "Loading…"
          : `${users.length} ${users.length === 1 ? "user" : "users"}`}
      </h3>
      <div className="mt-2 space-y-2">
        {users.map((u) => {
          const editing = editingEmail === u.email;
          const thisRowBusy = rowBusy === u.email;
          const otherHubs = HUB_ORDER.filter((h) => !u.hubs.includes(h));
          return (
            <div
              key={u.email}
              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              {editing ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={editFirst}
                    onChange={(e) => setEditFirst(e.target.value)}
                    placeholder="First name"
                    className={`${inputCls} h-9 min-w-0 flex-1`}
                  />
                  <input
                    type="text"
                    value={editLast}
                    onChange={(e) => setEditLast(e.target.value)}
                    placeholder="Last name"
                    className={`${inputCls} h-9 min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    disabled={thisRowBusy || !editFirst.trim()}
                    onClick={() => saveEdit(u)}
                    className="inline-flex h-9 shrink-0 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {thisRowBusy ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingEmail(null)}
                    className={rowBtnCls}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      {u.profilePictureUrl ? (
                        <img
                          src={u.profilePictureUrl}
                          alt={u.name || u.email}
                          className="h-10 w-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 shrink-0">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {u.name?.trim() || u.email.split("@")[0]}
                        </div>
                        <div className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                          {u.email} · joined {u.added_at.slice(0, 10)}
                        </div>
                      </div>
                    </div>
                    {u.isAdmin && (
                      <span className="shrink-0 rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                        Admin
                      </span>
                    )}
                  </div>

                  {/* hubs the user belongs to */}
                  <div className="flex flex-wrap gap-1">
                    {u.isAdmin ? (
                      <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        All hubs
                      </span>
                    ) : (
                      u.hubs.map((h) => (
                        <span
                          key={h}
                          className={`rounded border px-1.5 py-0.5 text-[10px] ${
                            h === hub
                              ? "border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                              : "border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500"
                          }`}
                        >
                          {HUBS[h].label}
                        </span>
                      ))
                    )}
                  </div>

                  {/* per-user actions */}
                  {!u.isAdmin && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={thisRowBusy}
                        onClick={() => startEdit(u)}
                        className={rowBtnCls}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={thisRowBusy}
                        onClick={() => sendSignin(u)}
                        className={rowBtnCls}
                      >
                        Send sign-in
                      </button>
                      {otherHubs.length > 0 && (
                        <select
                          disabled={thisRowBusy}
                          value=""
                          onChange={(e) => {
                            const h = e.target.value as HubId | "";
                            if (h) addToHub(u, h);
                          }}
                          aria-label={`Add ${u.email} to another hub`}
                          className="h-[26px] rounded-md border border-zinc-300 bg-white px-1.5 text-[11px] font-medium text-zinc-600 hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                        >
                          <option value="">Add to hub…</option>
                          {otherHubs.map((h) => (
                            <option key={h} value={h}>
                              {HUBS[h].label}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        disabled={thisRowBusy}
                        onClick={() => removeUser(u.email)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:border-rose-400 hover:text-rose-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-500 dark:hover:text-rose-400"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
