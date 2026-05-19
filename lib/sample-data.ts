// Mock data shaped like the real Atlas SMS system. Lives here so it's easy
// to swap out for live data once the Twilio + GHL integrations land.
//
// All numbers are realistic for an A2P 10DLC stack of ~10 sender numbers
// running 1.5k–3k sends/day across 3–4 active campaigns.

export const TODAY = "2026-05-10";

// ── Script folders ───────────────────────────────────────────────────────
//
// A "folder" is a bundle of related SMS templates. Atlas rotates through
// the templates in a folder per recipient (so each lead gets one of N
// variants). Campaigns point at a folder, not a single template.

export type ScriptFolder = {
  id: string;
  name: string;
  description: string;
  templateCount: number;
  lastEditedAt: string;
};

export type Template = {
  id: string;
  folderId: string;
  body: string;
  chars: number; // typical char count
  charsWorst: number; // worst-case char count once spintax + max-length variables are filled in
  variants: number; // how many spintax permutations
  sent: number;
  replyRate: number;
  optOutRate: number;
};

export const SCRIPT_FOLDERS: ScriptFolder[] = [
  {
    id: "folder_tx_compass",
    name: "TX · Compass",
    description: "Compass-brand agents in Texas metros (Austin, Houston, Dallas).",
    templateCount: 4,
    lastEditedAt: "2026-05-09T18:32:00Z",
  },
  {
    id: "folder_az_kw",
    name: "AZ · Keller Williams",
    description: "Keller Williams agents across Arizona — Phoenix, Tucson, Scottsdale.",
    templateCount: 3,
    lastEditedAt: "2026-05-08T14:10:00Z",
  },
  {
    id: "folder_fl_indie",
    name: "FL · Independents",
    description: "Independent and small-brokerage agents in Florida.",
    templateCount: 5,
    lastEditedAt: "2026-05-10T08:55:00Z",
  },
  {
    id: "folder_ca_remax",
    name: "CA · RE/MAX",
    description: "RE/MAX agents in top California metros.",
    templateCount: 3,
    lastEditedAt: "2026-05-06T19:48:00Z",
  },
];

export const TEMPLATES: Template[] = [
  // TX · Compass
  {
    id: "tpl_tx_compass_a",
    folderId: "folder_tx_compass",
    body: "{Hey|Hi} {{firstName}} — saw your Compass listing in {{state}}. Quick {Q|question}: open to a {tool|system} that books showings on autopilot? Reply STOP to stop.",
    chars: 152,
    charsWorst: 159,
    variants: 16,
    sent: 920,
    replyRate: 0.094,
    optOutRate: 0.024,
  },
  {
    id: "tpl_tx_compass_b",
    folderId: "folder_tx_compass",
    body: "{{firstName}}, {hey|hi} — caught your {{brokerage}} profile out of {{state}}. Curious if you'd {try|test} something that handles inbound buyer texts for you. If you don't reply I'll stop.",
    chars: 158,
    charsWorst: 159,
    variants: 8,
    sent: 1310,
    replyRate: 0.101,
    optOutRate: 0.023,
  },
  {
    id: "tpl_tx_compass_c",
    folderId: "folder_tx_compass",
    body: "{Hey|Hello} {{firstName}}! {Compass|Your Compass} listings in {{state}} stood out. We help agents auto-book qualified showings — interested? Reply STOP to opt out.",
    chars: 145,
    charsWorst: 154,
    variants: 4,
    sent: 410,
    replyRate: 0.084,
    optOutRate: 0.027,
  },
  {
    id: "tpl_tx_compass_d",
    folderId: "folder_tx_compass",
    body: "{{firstName}} — quick one. Built a system that lets {{brokerage}} agents in {{state}} skip the back-and-forth on showings. Worth a 5-min look? If not, just ignore.",
    chars: 156,
    charsWorst: 159,
    variants: 1,
    sent: 240,
    replyRate: 0.092,
    optOutRate: 0.018,
  },
  // AZ · KW
  {
    id: "tpl_az_kw_a",
    folderId: "folder_az_kw",
    body: "{Hey|Hi} {{firstName}}, saw you're with {{brokerage}} in {{state}}. We help KW agents auto-book buyer showings. Worth a peek? If you don't reply I'll stop.",
    chars: 150,
    charsWorst: 158,
    variants: 4,
    sent: 690,
    replyRate: 0.082,
    optOutRate: 0.014,
  },
  {
    id: "tpl_az_kw_b",
    folderId: "folder_az_kw",
    body: "{{firstName}}, {hey|hi} — {AZ|Arizona} KW agents are using us to auto-qualify and book showings. {Quick|Fast} demo? Reply STOP to stop.",
    chars: 132,
    charsWorst: 144,
    variants: 8,
    sent: 540,
    replyRate: 0.072,
    optOutRate: 0.011,
  },
  {
    id: "tpl_az_kw_c",
    folderId: "folder_az_kw",
    body: "{Hey|Hi} {{firstName}}, your {{brokerage}} profile out of {{state}} caught my eye. We {automate|streamline} agent showings. {Worth|Open to} a quick look?",
    chars: 144,
    charsWorst: 156,
    variants: 16,
    sent: 380,
    replyRate: 0.078,
    optOutRate: 0.012,
  },
  // FL · Independents
  {
    id: "tpl_fl_indie_a",
    folderId: "folder_fl_indie",
    body: "{Hey|Hi} {{firstName}} — independent agents in {{state}} are using us to auto-book showings. {Curious|Interested}? If you don't reply I'll stop texting.",
    chars: 149,
    charsWorst: 156,
    variants: 4,
    sent: 1180,
    replyRate: 0.108,
    optOutRate: 0.022,
  },
  {
    id: "tpl_fl_indie_b",
    folderId: "folder_fl_indie",
    body: "{{firstName}}, saw your listings in {{state}}. Built a {tool|system} that handles inbound buyer leads end-to-end. Worth 5 min? Reply STOP to stop.",
    chars: 144,
    charsWorst: 154,
    variants: 2,
    sent: 970,
    replyRate: 0.097,
    optOutRate: 0.020,
  },
  {
    id: "tpl_fl_indie_c",
    folderId: "folder_fl_indie",
    body: "{Hey|Hi} {{firstName}}! Quick {Q|question} for {{brokerage}} agents in {{state}}: {open to|exploring} an inbound system that books showings? If you don't reply I'll stop.",
    chars: 158,
    charsWorst: 159,
    variants: 16,
    sent: 720,
    replyRate: 0.105,
    optOutRate: 0.019,
  },
  {
    id: "tpl_fl_indie_d",
    folderId: "folder_fl_indie",
    body: "{{firstName}} — built something for {{state}} agents. Auto-books {showings|tours} from inbound texts. {Worth|Want} a peek? STOP to stop.",
    chars: 132,
    charsWorst: 149,
    variants: 4,
    sent: 340,
    replyRate: 0.091,
    optOutRate: 0.024,
  },
  {
    id: "tpl_fl_indie_e",
    folderId: "folder_fl_indie",
    body: "{Hey|Hi} {{firstName}} — independent agent in {{state}}, right? Helping folks like you skip the showing back-and-forth. If you don't reply I'll stop.",
    chars: 145,
    charsWorst: 153,
    variants: 4,
    sent: 210,
    replyRate: 0.114,
    optOutRate: 0.019,
  },
  // CA · RE/MAX
  {
    id: "tpl_ca_remax_a",
    folderId: "folder_ca_remax",
    body: "{Hey|Hi} {{firstName}}, RE/MAX in {{state}} — saw your profile. Auto-booking showings is now a thing. Worth a look? Reply STOP to stop.",
    chars: 132,
    charsWorst: 144,
    variants: 4,
    sent: 360,
    replyRate: 0.061,
    optOutRate: 0.034,
  },
  {
    id: "tpl_ca_remax_b",
    folderId: "folder_ca_remax",
    body: "{{firstName}}, quick one for {{brokerage}} in {{state}}. We auto-book qualified showings for top agents. {Curious|Open}? If you don't reply I'll stop.",
    chars: 143,
    charsWorst: 156,
    variants: 4,
    sent: 320,
    replyRate: 0.066,
    optOutRate: 0.031,
  },
  {
    id: "tpl_ca_remax_c",
    folderId: "folder_ca_remax",
    body: "{Hey|Hi} {{firstName}} — {CA|California} RE/MAX agents are saving hours/week on showing logistics. {Worth|Open to} a 5-min walkthrough?",
    chars: 130,
    charsWorst: 142,
    variants: 8,
    sent: 240,
    replyRate: 0.063,
    optOutRate: 0.034,
  },
];

// ── Campaigns ────────────────────────────────────────────────────────────

export type CampaignStatus = "running" | "paused";

export type Campaign = {
  id: string;
  name: string;
  scriptFolderId: string;
  status: CampaignStatus;
  leadCount: number;
  sentToday: number;
  replies: number;
  optOuts: number;
  progress: number;
  createdAt: string;
  pauseReason?: string;
};

export const ACTIVE_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp_tx_compass_q2",
    name: "TX · Compass · Q2",
    scriptFolderId: "folder_tx_compass",
    status: "running",
    leadCount: 2300,
    sentToday: 412,
    replies: 38,
    optOuts: 7,
    progress: 0.61,
    createdAt: "2026-04-22T17:00:00Z",
  },
  {
    id: "cmp_az_kw_spring",
    name: "AZ · Keller Williams · Spring",
    scriptFolderId: "folder_az_kw",
    status: "running",
    leadCount: 1640,
    sentToday: 287,
    replies: 21,
    optOuts: 4,
    progress: 0.34,
    createdAt: "2026-05-01T17:00:00Z",
  },
  {
    id: "cmp_ca_re_max",
    name: "CA · RE/MAX · top metros",
    scriptFolderId: "folder_ca_remax",
    status: "paused",
    leadCount: 980,
    sentToday: 0,
    replies: 0,
    optOuts: 0,
    progress: 0.18,
    createdAt: "2026-05-04T15:30:00Z",
    pauseReason: "outside send window",
  },
  {
    id: "cmp_fl_independents",
    name: "FL · Independents",
    scriptFolderId: "folder_fl_indie",
    status: "running",
    leadCount: 3120,
    sentToday: 548,
    replies: 49,
    optOuts: 11,
    progress: 0.82,
    createdAt: "2026-04-18T17:00:00Z",
  },
];

// ── Dashboard KPIs + supporting panels ──────────────────────────────────

export const KPIS = {
  sentToday: { value: 1247, target: 1500 },
  replyRate7d: 0.084,
  optOutRate7d: 0.019,
  bookedMeetings7d: 14,
  replyRateDelta: 0.011,
  optOutRateDelta: -0.004,
  bookedDelta: 3,
  sentDelta: 0.06,
};

// Top templates surfaced on the dashboard — flattened across all folders
// and ranked by reply rate.
export const TOP_TEMPLATES = [...TEMPLATES]
  .sort((a, b) => b.replyRate - a.replyRate)
  .slice(0, 4)
  .map((t) => {
    const folder = SCRIPT_FOLDERS.find((f) => f.id === t.folderId);
    return {
      id: t.id,
      label: `${folder?.name ?? "?"} · ${shortId(t.id)}`,
      sent: t.sent,
      replyRate: t.replyRate,
      optOutRate: t.optOutRate,
    };
  });

function shortId(id: string): string {
  // tpl_tx_compass_a → "v.a"
  const last = id.split("_").pop() ?? id;
  return `v.${last}`;
}

export const RECENT_REPLIES = [
  {
    id: "r_001",
    from: "+1 (512) 555-0181",
    firstName: "Marcus",
    state: "TX",
    body: "Yeah I'd be open to hearing more — what's this about?",
    sentiment: "positive" as const,
    template: "tpl_tx_compass_b",
    receivedAt: "2026-05-10T15:42:00Z",
  },
  {
    id: "r_002",
    from: "+1 (480) 555-0192",
    firstName: "Hannah",
    state: "AZ",
    body: "Sure, send me a quick overview.",
    sentiment: "positive" as const,
    template: "tpl_az_kw_a",
    receivedAt: "2026-05-10T15:31:00Z",
  },
  {
    id: "r_003",
    from: "+1 (786) 555-0144",
    firstName: "Diego",
    state: "FL",
    body: "what number is this",
    sentiment: "neutral" as const,
    template: "tpl_fl_indie_c",
    receivedAt: "2026-05-10T15:18:00Z",
  },
  {
    id: "r_004",
    from: "+1 (832) 555-0114",
    firstName: "Aisha",
    state: "TX",
    body: "Not interested but thanks",
    sentiment: "neutral" as const,
    template: "tpl_tx_compass_a",
    receivedAt: "2026-05-10T14:54:00Z",
  },
  {
    id: "r_005",
    from: "+1 (407) 555-0166",
    firstName: "Connor",
    state: "FL",
    body: "Send the link",
    sentiment: "positive" as const,
    template: "tpl_fl_indie_a",
    receivedAt: "2026-05-10T14:39:00Z",
  },
];

export const SENDER_NUMBERS = [
  { number: "+1 (737) 555-0102", area: "TX", sentToday: 158, status: "active" as const },
  { number: "+1 (737) 555-0103", area: "TX", sentToday: 146, status: "active" as const },
  { number: "+1 (480) 555-0204", area: "AZ", sentToday: 142, status: "active" as const },
  { number: "+1 (623) 555-0210", area: "AZ", sentToday: 145, status: "active" as const },
  { number: "+1 (786) 555-0301", area: "FL", sentToday: 137, status: "active" as const },
  { number: "+1 (407) 555-0309", area: "FL", sentToday: 133, status: "active" as const },
  { number: "+1 (415) 555-0405", area: "CA", sentToday: 0, status: "paused" as const },
  { number: "+1 (213) 555-0411", area: "CA", sentToday: 0, status: "paused" as const },
  { number: "+1 (929) 555-0512", area: "NY", sentToday: 188, status: "active" as const },
  { number: "+1 (646) 555-0518", area: "NY", sentToday: 198, status: "active" as const },
];

// Helper: campaign rows joined with their script folder, for UI display.
export function campaignsWithFolders() {
  return ACTIVE_CAMPAIGNS.map((c) => ({
    ...c,
    folder: SCRIPT_FOLDERS.find((f) => f.id === c.scriptFolderId) ?? null,
  }));
}

export function templatesForFolder(folderId: string): Template[] {
  return TEMPLATES.filter((t) => t.folderId === folderId);
}
