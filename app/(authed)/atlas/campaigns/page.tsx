import { CampaignsView } from "./campaigns-view";
import {
  SCRIPT_FOLDERS_SEED,
  TEMPLATES_SEED,
} from "../scripts/seed-folders";

export default function CampaignsPage() {
  // Initial values are shared with the Scripts tab via the localStorage
  // hook keys ("folders", "templates"). They're seeded once with the V2
  // bundle from Notion and stay in sync after any edits.
  return (
    <CampaignsView
      initialFolders={SCRIPT_FOLDERS_SEED}
      initialTemplates={TEMPLATES_SEED}
    />
  );
}
