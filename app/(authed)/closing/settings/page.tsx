import { readFile } from "node:fs/promises";
import path from "node:path";
import { ProseMarkdown } from "@/components/prose-markdown";

export default async function ClosingSettings() {
  const source = await readFile(
    path.join(process.cwd(), "content", "set-up.md"),
    "utf8",
  );
  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Closer setup checklist + payment contract.
        </p>
      </header>
      <ProseMarkdown source={source} />
    </section>
  );
}
