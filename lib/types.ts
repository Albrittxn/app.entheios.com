// Shared types for the Atlas SMS data model. Storage hasn't been wired up
// yet — these are the shapes used by the UI when real campaigns, folders,
// and templates start flowing in.

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
  chars: number;
  charsWorst: number;
  variants: number;
  sent: number;
  replyRate: number;
  optOutRate: number;
};

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

// Send totals for the dashboard "Texts sent" panel — bucketed by range.
export type DailySends = {
  today: number;
  last7d: number;
  last30d: number;
};

// A real-estate agent lead in the master Atlas database. Required columns
// match the Campaign Builder's required columns one-for-one. `groupIds`
// tracks which groups this lead belongs to (a lead can be in 0 or more
// groups — "ungrouped" means `groupIds.length === 0`).
export type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  brokerage: string;
  state: string;
  addedAt: string;
  groupIds: string[];
};

// A named collection of leads — used as the targeting unit when building a
// campaign. A lead can belong to many groups (think "tags").
export type LeadGroup = {
  id: string;
  name: string;
  createdAt: string;
};

// A meeting that was booked through an Atlas SMS reply (typically via the
// Cal.com flow attached to the inbound campaign).
export type UpcomingMeeting = {
  id: string;
  leadName: string;
  leadState: string;
  brokerage: string;
  campaignId: string;
  campaignName: string;
  startsAt: string; // ISO
};

// Aggregate reply / booking performance by US state.
export type StatePerf = {
  state: string;
  sent: number;
  replies: number;
  replyRate: number;
  meetings: number;
};
