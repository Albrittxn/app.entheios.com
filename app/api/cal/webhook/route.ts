// Cal.com booking webhook → hydrates the Closing → Calls portal.
//
// Cal.com signs each delivery with HMAC-SHA256 of the raw body using the
// shared secret. Header: X-Cal-Signature-256 (hex).
//
// Triggers we handle:
//   BOOKING_CREATED                   → upsert as new Booked lead
//   BOOKING_RESCHEDULED               → update time + flag rescheduled
//   BOOKING_CANCELLED                 → set status=Cancelled
//   BOOKING_NO_SHOW_UPDATED           → set status=No-Show
//   RECORDING_READY                   → attach recording URL
//   RECORDING_TRANSCRIPTION_GENERATED → attach transcript URL (+ recording)

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getLeadMeetingLink, type Lead, type LeadSource, type LeadStatus } from "@/lib/closing-leads";
import { patchLead, upsertLead } from "@/lib/closing-leads-store";

export const runtime = "nodejs";

// Inbound (rich) form: discovery-call-in → eventTypeId 5679489
// Quick (lightweight) form: discovery-call-out → eventTypeId 5679760
const INBOUND_EVENT_TYPE_IDS = new Set<number>([5679489]);

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function pickString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v && typeof v === "object") {
    // Cal.com sometimes wraps response values as { value: "..." }
    const val = (v as { value?: unknown }).value;
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

function mapBookingToLead(payload: Record<string, unknown>, source: LeadSource): Lead {
  const responses = (payload.responses ?? {}) as Record<string, unknown>;
  const attendees = Array.isArray(payload.attendees) ? (payload.attendees as Array<Record<string, unknown>>) : [];
  const a0 = attendees[0] ?? {};
  const hosts = Array.isArray(payload.hosts) ? (payload.hosts as Array<Record<string, unknown>>) : [];
  const organizer = (payload.organizer ?? {}) as Record<string, unknown>;
  const host = hosts[0] ?? organizer;
  const closerEmail = pickString(host.email);
  const closerName = pickString(host.name);

  const name =
    pickString(responses.name) ??
    pickString(a0.name) ??
    "Unnamed lead";
  const email =
    pickString(responses.email) ??
    pickString(a0.email) ??
    "";
  const phone =
    pickString(responses.attendeePhoneNumber) ??
    pickString(responses.phone) ??
    pickString(a0.phoneNumber) ??
    "";
  const startTime =
    pickString(payload.startTime) ??
    pickString(payload.start) ??
    new Date().toISOString();
  const meetingLinkValue =
    pickString(payload.meetingUrl) ??
    pickString(payload.location) ??
    undefined;
  const uid = pickString(payload.uid) ?? `lead_${Date.now()}`;

  const inbound = source === "inbound";

  return {
    id: uid,
    source,
    name,
    email,
    phone,
    website: pickString(responses["agent-website"]),
    brokerage: pickString(responses.brokerage),
    market: inbound
      ? pickString(responses.market)
      : pickString(responses.state),
    annualClosings: inbound ? pickString(responses["annual-closings"]) : undefined,
    avgSalePrice: inbound ? pickString(responses["avg-sale-price"]) : undefined,
    bottleneck: inbound ? pickString(responses["biggest-bottleneck"]) : undefined,
    bookerMessage: inbound
      ? pickString(responses["previous-tools"])
      : pickString(responses["booking-notes"]),
    closerEmail,
    closerName,
    meetingTimeIso: startTime,
    meetingLink: getLeadMeetingLink({ id: uid, meetingLink: meetingLinkValue }),
    status: "Booked",
    objections: [],
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

function detectSource(payload: Record<string, unknown>): LeadSource {
  const evt = (payload.eventType ?? {}) as Record<string, unknown>;
  const evtTypeId = Number(payload.eventTypeId ?? evt.id);
  if (INBOUND_EVENT_TYPE_IDS.has(evtTypeId)) return "inbound";
  const slug = pickString(evt.slug);
  if (slug === "discovery-call-in") return "inbound";
  return "quick";
}

export async function POST(req: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("x-cal-signature-256");
  if (!verifySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: { triggerEvent?: string; payload?: Record<string, unknown> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trigger = body.triggerEvent;
  const payload = body.payload ?? {};
  const uid = pickString(payload.uid);
  if (!uid) {
    return NextResponse.json({ error: "Missing booking uid" }, { status: 400 });
  }

  try {
    switch (trigger) {
      case "BOOKING_CREATED": {
        const lead = mapBookingToLead(payload, detectSource(payload));
        await upsertLead(lead);
        break;
      }
      case "BOOKING_RESCHEDULED": {
        const lead = mapBookingToLead(payload, detectSource(payload));
        lead.rescheduled = true;
        await upsertLead(lead);
        break;
      }
      case "BOOKING_CANCELLED": {
        await patchLead(uid, { status: "Cancelled" as LeadStatus, updatedAt: new Date().toISOString() });
        break;
      }
      case "BOOKING_NO_SHOW_UPDATED":
      case "BOOKING_NO_SHOW": {
        await patchLead(uid, { status: "No-Show" as LeadStatus, updatedAt: new Date().toISOString() });
        break;
      }
      case "RECORDING_READY": {
        const recordingUrl =
          pickString((payload as Record<string, unknown>).downloadLink) ??
          pickString((payload as Record<string, unknown>).recordingUrl) ??
          undefined;
        await patchLead(uid, { recordingUrl, updatedAt: new Date().toISOString() });
        break;
      }
      case "RECORDING_TRANSCRIPTION_GENERATED": {
        // Cal.com payload: downloadLinks.transcription[] (JSON/SRT/TXT/VTT,
        // each { format, link }) plus downloadLinks.recording. We attach a
        // readable transcript link and re-confirm the recording URL.
        const dl =
          payload.downloadLinks && typeof payload.downloadLinks === "object"
            ? (payload.downloadLinks as Record<string, unknown>)
            : {};
        let transcriptUrl: string | undefined;
        if (Array.isArray(dl.transcription)) {
          const items = dl.transcription as Array<Record<string, unknown>>;
          const preferred =
            items.find((t) => /txt|vtt/i.test(String(t.format ?? ""))) ??
            items[0];
          transcriptUrl = preferred ? pickString(preferred.link) : undefined;
        }
        const recordingUrl = pickString(dl.recording);
        const patch: Partial<Lead> = { updatedAt: new Date().toISOString() };
        if (transcriptUrl) patch.transcriptUrl = transcriptUrl;
        if (recordingUrl) patch.recordingUrl = recordingUrl;
        await patchLead(uid, patch);
        break;
      }
      default:
        // Unhandled trigger — acknowledge so cal.com doesn't retry.
        break;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
