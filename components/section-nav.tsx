"use client";

// "On this page" — sticky right-side section navigator for long content
// (Closing → Systems, Script). Click to jump; the active section tracks the
// scroll position. Section ids are produced by lib/markdown-toc + rendered
// onto the headings by ProseMarkdown.

import { useEffect, useState } from "react";
import type { Section } from "@/lib/markdown-toc";
import { cn } from "@/lib/utils";

export function SectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  function jump(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  return (
    <nav
      className="max-h-full w-full overflow-y-auto"
      aria-label="On this page"
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        On this page
      </div>
      <ul className="border-l border-zinc-200 dark:border-zinc-800">
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => jump(s.id)}
                className={cn(
                  "-ml-px block w-full border-l-2 py-1 text-left text-xs leading-snug transition-colors",
                  s.level === 2 ? "pl-5" : "pl-3",
                  isActive
                    ? "border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200",
                )}
              >
                {s.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
