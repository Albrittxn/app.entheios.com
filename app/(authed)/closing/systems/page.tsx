import { readFile } from "node:fs/promises";
import path from "node:path";
import { getEffectiveUser } from "@/lib/effective-user";
import { getUserRecord } from "@/lib/permissions";
import { SystemsView } from "@/components/closing/systems-view";
import { SectionNav } from "@/components/section-nav";
import { extractSections, type Section } from "@/lib/markdown-toc";

export const dynamic = "force-dynamic";

export default async function ClosingSystems() {
  const [source, setupSource, ctx] = await Promise.all([
    readFile(path.join(process.cwd(), "content", "systems.md"), "utf8"),
    readFile(path.join(process.cwd(), "content", "set-up.md"), "utf8"),
    getEffectiveUser(),
  ]);
  const email = ctx?.effectiveEmail ?? "";
  const record = email ? await getUserRecord(email) : null;
  const name = record?.name ?? email;

  // Section nav covers the markdown headings only — the Payment Contract
  // card lives inline on the page but isn't a nav entry.
  const sections: Section[] = [
    ...extractSections(setupSource),
    ...extractSections(source),
  ];

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Systems</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Setup checklist + post-call SOP — everything a closer needs, start to
          finish.
        </p>
      </header>
      <div className="lg:flex lg:gap-10">
        <div className="min-w-0 lg:flex-1">
          <SystemsView
            setupMarkdown={setupSource}
            markdown={source}
            closerEmail={email}
            closerName={name}
          />
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
