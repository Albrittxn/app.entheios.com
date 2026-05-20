// Hub configuration — the product surfaces unified under app.entheios.com,
// plus the company-wide Dashboard hub that rolls up across all of them.

export type HubId = "dashboard" | "atlas" | "closing" | "sales" | "leads" | "investing";

export type Tab = {
  id: string;
  href: string;
  label: string;
  adminOnly?: boolean;
};

export type Hub = {
  id: HubId;
  label: string;
  basePath: string;
  defaultPath: string;
  accentClass: string;
  tabs: Tab[];
};

export const HUBS: Record<HubId, Hub> = {
  dashboard: {
    id: "dashboard",
    label: "Dashboard",
    basePath: "/dashboard",
    defaultPath: "/dashboard/overview",
    accentClass: "text-gold dark:text-gold-soft",
    tabs: [
      { id: "overview", href: "/dashboard/overview", label: "Overview" },
      { id: "pipeline", href: "/dashboard/pipeline", label: "Pipeline" },
    ],
  },
  atlas: {
    id: "atlas",
    label: "Atlas",
    basePath: "/atlas",
    defaultPath: "/atlas/dashboard",
    accentClass: "text-gold dark:text-gold-soft",
    tabs: [
      { id: "dashboard", href: "/atlas/dashboard", label: "Dashboard" },
      { id: "leads", href: "/atlas/leads", label: "Leads" },
      { id: "campaigns", href: "/atlas/campaigns", label: "Campaigns" },
      { id: "conversations", href: "/atlas/conversations", label: "Conversations" },
      { id: "scripts", href: "/atlas/scripts", label: "Scripts" },
      { id: "ai", href: "/atlas/ai", label: "AI" },
      { id: "updates", href: "/atlas/updates", label: "Updates" },
      { id: "settings", href: "/atlas/settings", label: "Settings" },
      { id: "admin", href: "/atlas/admin", label: "Admin", adminOnly: true },
    ],
  },
  closing: {
    id: "closing",
    label: "Closing",
    basePath: "/closing",
    defaultPath: "/closing/calls",
    accentClass: "text-gold dark:text-gold-soft",
    tabs: [
      { id: "calls", href: "/closing/calls", label: "Calls" },
      { id: "script", href: "/closing/script", label: "Script" },
      { id: "offer", href: "/closing/offer", label: "Offer" },
      { id: "systems", href: "/closing/systems", label: "Systems" },
      { id: "slides", href: "/closing/slides", label: "Slides" },
      { id: "notes", href: "/closing/notes", label: "Notes" },
      { id: "settings", href: "/closing/settings", label: "Settings" },
      { id: "admin", href: "/closing/admin", label: "Admin", adminOnly: true },
    ],
  },
  sales: {
    id: "sales",
    label: "Sales",
    basePath: "/sales",
    defaultPath: "/sales/dashboard",
    accentClass: "text-gold dark:text-gold-soft",
    tabs: [
      { id: "dashboard", href: "/sales/dashboard", label: "Dashboard" },
      { id: "script", href: "/sales/script", label: "Script" },
      { id: "systems", href: "/sales/systems", label: "Systems" },
      { id: "leads", href: "/sales/leads", label: "Leads" },
      { id: "notes", href: "/sales/notes", label: "Notes" },
      { id: "admin", href: "/sales/admin", label: "Admin", adminOnly: true },
    ],
  },
  leads: {
    id: "leads",
    label: "Leads",
    basePath: "/leads",
    defaultPath: "/leads",
    accentClass: "text-gold dark:text-gold-soft",
    tabs: [
      { id: "leads", href: "/leads", label: "Leads" },
      { id: "batches", href: "/leads/batches", label: "Batches" },
      { id: "folders", href: "/leads/folders", label: "Folders" },
      { id: "admin", href: "/leads/admin", label: "Admin", adminOnly: true },
    ],
  },
  investing: {
    id: "investing",
    label: "Investing",
    basePath: "/investing",
    defaultPath: "/investing/overview",
    accentClass: "text-gold dark:text-gold-soft",
    tabs: [
      { id: "overview", href: "/investing/overview", label: "Overview" },
      { id: "admin", href: "/investing/admin", label: "Admin", adminOnly: true },
    ],
  },
};

export const HUB_ORDER: HubId[] = ["dashboard", "atlas", "closing", "sales", "leads", "investing"];

export function hubFromPathname(pathname: string): HubId | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && (HUB_ORDER as string[]).includes(seg)) return seg as HubId;
  return null;
}
