import { ScriptsView } from "./scripts-view";
import { SCRIPT_FOLDERS_SEED, TEMPLATES_SEED } from "./seed-folders";

export default function ScriptsPage() {
  return (
    <ScriptsView folders={SCRIPT_FOLDERS_SEED} templates={TEMPLATES_SEED} />
  );
}
