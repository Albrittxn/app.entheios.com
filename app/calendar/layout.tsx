// Booking shell — no auth, no app chrome. Hosted at calendar.entheios.com.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a call — Entheios",
  description: "Schedule a call with the Entheios team.",
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className="border-b border-zinc-200/60 px-6 py-4 dark:border-zinc-800/60">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Entheios"
            className="h-7 w-auto select-none dark:invert dark:brightness-200"
          />
          <span>Entheios</span>
        </a>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
