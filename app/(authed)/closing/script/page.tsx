import { readFile } from "node:fs/promises";
import path from "node:path";
import { ProseMarkdown } from "@/components/prose-markdown";
import { SectionNav } from "@/components/section-nav";
import { extractSections } from "@/lib/markdown-toc";

export default async function ClosingScript() {
  const source = await readFile(
    path.join(process.cwd(), "content", "script.md"),
    "utf8",
  );
  const sections = extractSections(source);

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Script</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The full closer sales script — discovery, demo, pricing, close.
        </p>
      </header>
      <div className="lg:flex lg:gap-10">
        <div className="min-w-0 lg:flex-1">
          <ProseMarkdown source={source} />
        </div>
        <aside className="hidden lg:flex lg:w-56 lg:shrink-0">
          <div className="sticky top-28 flex h-[calc(100vh-7rem)] items-center">
            <SectionNav sections={sections} />
          </div>
        </aside>
      </div>
    </section>
  );
}
