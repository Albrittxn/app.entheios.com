// Lead model for the Closing → Calls tab. Real bookings are hydrated from
// the Cal.com webhook payload and persisted in Edge Config; this file just
// defines the shape and the small helpers that surface them.

export type LeadSource = "inbound" | "quick";

export type LeadStatus =
  | "Booked"
  | "Cancelled"
  | "No-Show"
  | "Closed"
  | "No Close"
  | "Follow-Up Requested"
  | "Nurture";

export const LEAD_STATUSES: LeadStatus[] = [
  "Booked",
  "Cancelled",
  "No-Show",
  "Closed",
  "No Close",
  "Follow-Up Requested",
  "Nurture",
];

export type LeadObjection =
  | "Price"
  | "Timing"
  | "Spouse/Partner"
  | "Already has solution"
  | "Doesn't believe it works"
  | "Wants to think it over"
  | "Not a fit"
  | "Other";

export const LEAD_OBJECTIONS: LeadObjection[] = [
  "Price",
  "Timing",
  "Spouse/Partner",
  "Already has solution",
  "Doesn't believe it works",
  "Wants to think it over",
  "Not a fit",
  "Other",
];

export type Lead = {
  id: string;
  source: LeadSource;
  // Contact
  name: string;
  email: string;
  phone: string;
  website?: string;
  // Lead context
  brokerage?: string;
  market?: string; // city/state for inbound, just state for quick
  // Pipeline (inbound only)
  annualClosings?: string;
  avgSalePrice?: string;
  bottleneck?: string;
  // Free-form answer from whichever form they filled out.
  // Inbound: "Anything we should know? (lead-gen services or tools you have
  //           already tried, what worked, what didn't)"  (slug: previous-tools)
  // Quick:   "Anything else we should know before the call?"
  //                                                       (slug: booking-notes)
  bookerMessage?: string;
  // Assigned closer (from cal.com round-robin host)
  closerEmail?: string;
  closerName?: string;
  // Meeting metadata
  meetingTimeIso: string;
  meetingLink?: string;
  rescheduled?: boolean;
  recordingUrl?: string | null;
  transcriptUrl?: string | null;
  // Closer-editable
  status: LeadStatus;
  objections: LeadObjection[];
  followUpDate?: string; // YYYY-MM-DD
  notes?: string;
  createdAt?: string; // ISO — set by webhook on first booking, never overwritten
  updatedAt?: string; // ISO
};

export function splitUpcomingPast(leads: Lead[]) {
  const now = new Date();
  const upcoming: Lead[] = [];
  const past: Lead[] = [];
  for (const l of leads) {
    if (new Date(l.meetingTimeIso) >= now) upcoming.push(l);
    else past.push(l);
  }
  upcoming.sort(
    (a, b) =>
      new Date(a.meetingTimeIso).getTime() - new Date(b.meetingTimeIso).getTime(),
  );
  past.sort(
    (a, b) =>
      new Date(b.meetingTimeIso).getTime() - new Date(a.meetingTimeIso).getTime(),
  );
  return { upcoming, past };
}

export function formatMeetingTime(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  try {
    return d.toLocaleString(undefined, {
      timeZone: timeZone || undefined,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    // Fallback if timezone is invalid
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
}
