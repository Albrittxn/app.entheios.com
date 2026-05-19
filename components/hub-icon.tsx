// Small icon shown next to each hub label in the switcher dropdown.
// Uses currentColor so the parent's text color drives the stroke — that's
// how each hub gets its accent.

import type { HubId } from "@/lib/hubs";

const ICONS: Record<HubId, React.ReactNode> = {
  // Dashboard → bar chart / metrics
  dashboard: (
    <>
      <line x1="3" y1="21" x2="21" y2="21" />
      <rect x="5" y="12" width="3.4" height="6" />
      <rect x="10.3" y="7" width="3.4" height="11" />
      <rect x="15.6" y="14" width="3.4" height="4" />
    </>
  ),
  // Atlas → SMS chat bubble (Atlas runs the SMS outreach)
  atlas: (
    <>
      <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-6l-4 3.5V16H6a2 2 0 01-2-2V6z" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
    </>
  ),
  // Closing → small group of people (closers)
  closing: (
    <>
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="17" cy="10" r="2.4" />
      <path d="M3 19c1-3 3.5-4.5 6-4.5s5 1.5 6 4.5" />
      <path d="M14.5 16.5c.8-1.3 2.4-2 3.5-2 1.7 0 3 1.2 3 3" />
    </>
  ),
  // Sales → outbound phone
  sales: (
    <>
      <path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5L14 12.5 18 14v3a2 2 0 01-2 2A14 14 0 014 8a2 2 0 011-2z" />
      <path d="M16 4l4 4M20 4l-4 4" />
    </>
  ),
  // Leads → list / database
  leads: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="2.5" />
      <path d="M4 5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5" />
      <path d="M4 11v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6" />
    </>
  ),
  // Investing → upward trend line with arrow
  investing: (
    <>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </>
  ),
};

export function HubIcon({ id, className }: { id: HubId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      {ICONS[id]}
    </svg>
  );
}
