"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";

type AllowedEmail = { email: string; added_at: string; name?: string };

export function AccessManager({
  initialEmails,
  adminEmail,
}: {
  initialEmails: AllowedEmail[];
  adminEmail: string;
}) {
  const toast = useToast();
  const [emails, setEmails] = useState<AllowedEmail[]>(initialEmails);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = newEmail.trim();
    if (!email) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Could not add email.");
        return;
      }
      setEmails(j.emails ?? []);
      setNewEmail("");
    });
  }

  function remove(email: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/access?email=${encodeURIComponent(email)}`,
        { method: "DELETE" },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Could not remove email.");
        return;
      }
      setEmails(j.emails ?? []);
      // Undo re-adds the email via the same endpoint that "Add access" uses.
      // Server-side this loses the original `added_at` timestamp (it becomes
      // "now"), but the row is otherwise restored.
      toast.show(`Removed ${email}`, {
        undo: async () => {
          const addRes = await fetch("/api/admin/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const addJson = await addRes.json().catch(() => ({}));
          if (!addRes.ok) {
            throw new Error(addJson.error ?? "Couldn't restore access.");
          }
          setEmails(addJson.emails ?? []);
        },
      });
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Add access
        </h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          They'll be able to sign in at the next code request — no invitation
          email is sent.
        </p>
        <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label
              htmlFor="new-email"
              className="text-zinc-900 dark:text-zinc-100"
            >
              Email
            </Label>
            <Input
              id="new-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="someone@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={pending}
              className="border-zinc-300 bg-white focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-zinc-400"
            />
          </div>
          <Button
            type="submit"
            disabled={pending || !newEmail.trim()}
            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "Saving…" : "Add email"}
          </Button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-rose-700 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            People with access
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {emails.length} {emails.length === 1 ? "email" : "emails"}
          </p>
        </div>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {emails.map(({ email, added_at, name }) => {
            const isAdmin = email === adminEmail;
            return (
              <li
                key={email}
                className="flex items-center justify-between gap-4 px-6 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {name ?? <span className="italic text-zinc-400 dark:text-zinc-600">no name yet</span>}
                    </span>
                    {isAdmin && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
                        admin
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {email}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-600">
                    Added {formatDate(added_at)}
                  </div>
                </div>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => remove(email)}
                    disabled={pending}
                    className="text-xs font-medium text-zinc-500 hover:text-rose-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-rose-400"
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
