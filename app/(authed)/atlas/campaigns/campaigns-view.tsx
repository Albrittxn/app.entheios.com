"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type {
  Campaign,
  Lead,
  LeadGroup,
  ScriptFolder,
  Template,
} from "@/lib/types";
import { useLocalState } from "@/lib/local-store";
import { useToast } from "@/components/toast-provider";
import { CampaignBuilder } from "./campaign-builder";
import { LiveCampaigns } from "./live-campaigns";

export function CampaignsView({
  initialFolders,
  initialTemplates,
}: {
  initialFolders: ScriptFolder[];
  initialTemplates: Template[];
}) {
  // All four collections live in localStorage so Campaigns, Leads, and
  // Scripts stay in sync without a real backend. Clean slate — everything
  // starts empty; the bumped key suffixes supersede any cached demo data.
  const toast = useToast();
  const [campaigns, setCampaigns] = useLocalState<Campaign[]>(
    "campaigns-v3",
    [],
  );
  const [folders] = useLocalState<ScriptFolder[]>("folders-v2", initialFolders);
  // Templates store kept in sync with the Scripts tab.
  useLocalState<Template[]>("templates-v3", initialTemplates);
  const [leads] = useLocalState<Lead[]>("leads-v3", []);
  const [groups] = useLocalState<LeadGroup[]>("groups-v2", []);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  function handleCreate(c: Campaign) {
    setCampaigns((prev) => [c, ...prev]);
    setJustCreated(c.id);
    setTimeout(() => setJustCreated((id) => (id === c.id ? null : id)), 2400);
  }

  function handleUpdate(id: string, patch: Partial<Campaign>) {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function handleDelete(id: string) {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;
    // Capture the original position so undo restores it where it was.
    const originalIndex = campaigns.findIndex((c) => c.id === id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.show(`Deleted campaign "${campaign.name}"`, {
      undo: () =>
        setCampaigns((prev) => {
          const next = [...prev];
          next.splice(Math.max(0, originalIndex), 0, campaign);
          return next;
        }),
    });
  }

  return (
    <section>
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Build new SMS campaigns from a script folder + lead source, or
            manage live ones below.
          </p>
        </div>
      </header>

      <div className="space-y-10">
        <CampaignBuilder
          folders={folders}
          leads={leads}
          groups={groups}
          onCreate={handleCreate}
        />

        <AnimatePresence>
          {justCreated && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              role="status"
            >
              Campaign created — paused by default. Toggle it on below to start sending.
            </motion.div>
          )}
        </AnimatePresence>

        <LiveCampaigns
          campaigns={campaigns}
          folders={folders}
          highlightId={justCreated}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </section>
  );
}
