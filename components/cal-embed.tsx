// Branded calendar landing page. The "Pick a time" button opens the
// cal.com booking page in a new tab. Cal's embed SDK refused to render in
// this Next 16 + Turbopack stack across three attempts (inline component,
// imperative inline, popup) — falling back to a plain hyperlink keeps the
// booking flow reliable. The visible compromise: cal.com still shows its
// own team-name header inside their booking page.

export type EventInfo = {
  title: string;
  description: string;
  durationMin: number;
  locationLabel: string;
};

export function CalEmbed({
  calLink,
  event,
}: {
  calLink: string;
  event: EventInfo;
}) {
  const href = `https://cal.com/${calLink}`;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col items-start justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {event.title}
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {event.description}
        </p>
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <ClockIcon />
          <span>{event.durationMin} min</span>
        </div>
        <div className="flex items-center gap-2">
          <VideoIcon />
          <span>{event.locationLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <GlobeIcon />
          <span>Shown in your local timezone</span>
        </div>
      </dl>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex h-12 items-center gap-2 rounded-md bg-zinc-900 px-6 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Pick a time
        <ArrowIcon />
      </a>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="M17 10l4-2v8l-4-2" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
