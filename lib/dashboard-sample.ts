// Atlas dashboard data source.
//
// Clean slate — no demo data. Every dashboard panel renders its empty state
// until the real services (Twilio + GHL + Cal.com) are wired up. The shape
// is preserved so the dashboard + campaigns wallet keep compiling; swap the
// bodies below for live queries when the pipeline exists.

import type {
  Campaign,
  DailySends,
  StatePerf,
  Template,
  UpcomingMeeting,
} from "./types";

// Twilio per-SMS cost reference — used by the Campaigns wallet read-out.
export const COST_PER_SMS = 0.011;

export type DashboardSample = {
  sends: DailySends;
  upcomingMeetings: UpcomingMeeting[];
  liveCampaigns: Campaign[];
  topScripts: Template[];
  topStates: StatePerf[];
  // Total Twilio spend so far (cumulative sends × COST_PER_SMS).
  totalSpent: number;
  // Average $ spent per meeting booked. 0 before any meetings exist.
  costPerCallBooked: number;
};

export function getDashboardSample(): DashboardSample {
  return {
    sends: { today: 0, last7d: 0, last30d: 0 },
    upcomingMeetings: [],
    liveCampaigns: [],
    topScripts: [],
    topStates: [],
    totalSpent: 0,
    costPerCallBooked: 0,
  };
}

// Cumulative SMS sent across all campaigns. Zero until a real send pipeline
// is connected.
export function getCumulativeSends(): number {
  return 0;
}
