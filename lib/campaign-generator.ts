// Deterministic seed for the Campaigns tab. Mirrors the dashboard's "live
// campaigns" generator, but produces a richer list (mix of running / paused /
// recently-completed) so the page doesn't feel empty.
//
// Campaigns reference script folder IDs from `scripts/seed-folders.ts` — the
// CampaignsView shares those folders via localStorage so the IDs line up.

import type { Campaign } from "./types";

// Anchor matches the dashboard so progress numbers are consistent across tabs.
const ANCHOR = new Date("2026-05-11T00:00:00Z");

type SeededCampaign = {
  id: string;
  name: string;
  scriptFolderId: string;
  status: "running" | "paused";
  leadCount: number;
  // Hours after ANCHOR when this campaign was created.
  createdOffsetHours: number;
  // Roughly how far through its lead pool it is (0..1) right "now".
  progress: number;
  sentToday: number;
  replies: number;
  optOuts: number;
  pauseReason?: string;
};

const SEEDS: SeededCampaign[] = [
  {
    id: "cmp_tx_compass_q2",
    name: "TX · Compass · Q2",
    scriptFolderId: "folder_tx_compass",
    status: "running",
    leadCount: 2_300,
    createdOffsetHours: 4,
    progress: 0.61,
    sentToday: 412,
    replies: 38,
    optOuts: 7,
  },
  {
    id: "cmp_fl_independents",
    name: "FL · Independents",
    scriptFolderId: "folder_fl_indie",
    status: "running",
    leadCount: 3_120,
    createdOffsetHours: 8,
    progress: 0.71,
    sentToday: 548,
    replies: 49,
    optOuts: 11,
  },
  {
    id: "cmp_az_kw_spring",
    name: "AZ · Keller Williams · Spring",
    scriptFolderId: "folder_az_kw",
    status: "running",
    leadCount: 1_640,
    createdOffsetHours: 30,
    progress: 0.34,
    sentToday: 287,
    replies: 21,
    optOuts: 4,
  },
  {
    id: "cmp_ca_re_max",
    name: "CA · RE/MAX · top metros",
    scriptFolderId: "folder_ca_remax",
    status: "paused",
    leadCount: 980,
    createdOffsetHours: 80,
    progress: 0.18,
    sentToday: 0,
    replies: 0,
    optOuts: 0,
    pauseReason: "outside send window",
  },
  {
    id: "cmp_ny_compass_pilot",
    name: "NY · Compass · pilot",
    scriptFolderId: "folder_tx_compass",
    status: "running",
    leadCount: 1_180,
    createdOffsetHours: 56,
    progress: 0.42,
    sentToday: 218,
    replies: 14,
    optOuts: 3,
  },
];

export function generateSampleCampaigns(): Campaign[] {
  return SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    scriptFolderId: s.scriptFolderId,
    status: s.status,
    leadCount: s.leadCount,
    sentToday: s.sentToday,
    replies: s.replies,
    optOuts: s.optOuts,
    progress: s.progress,
    createdAt: new Date(
      ANCHOR.getTime() + s.createdOffsetHours * 3_600_000,
    ).toISOString(),
    ...(s.pauseReason ? { pauseReason: s.pauseReason } : {}),
  }));
}
