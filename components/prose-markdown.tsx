// Shared markdown renderer for ported content (Teams Script/Systems/etc.).
// Styled with atlas-style Tailwind so the prose matches the rest of the app.
//
// H1/H2 headings get slug ids + scroll-margin so the right-side SectionNav
// ("On this page") can jump to them. slugify() must match lib/markdown-toc.

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { slugify } from "@/lib/markdown-toc";

function childText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(childText).join("");
  if (typeof node === "object" && "props" in node) {
    return childText(
      (node as { props: { children?: React.ReactNode } }).props.children,
    );
  }
  return "";
}

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 id={slugify(childText(children))} className="scroll-mt-28">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 id={slugify(childText(children))} className="scroll-mt-28">
      {children}
    </h2>
  ),
};

export function ProseMarkdown({ source }: { source: string }) {
  return (
    <div
      className="
        prose-themed
        max-w-4xl
        text-sm leading-relaxed text-zinc-700 dark:text-zinc-300
        [&_h1]:mt-8 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-zinc-900 dark:[&_h1]:text-zinc-100
        [&_h1:first-child]:mt-0
        [&_h2]:mt-7 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100
        [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-900 dark:[&_h3]:text-zinc-100
        [&_p]:my-3
        [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5
        [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5
        [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 dark:[&_blockquote]:border-zinc-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-600 dark:[&_blockquote]:text-zinc-400
        [&_code]:rounded [&_code]:bg-zinc-100 dark:[&_code]:bg-zinc-900 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]
        [&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-zinc-100
        [&_em]:italic
        [&_a]:text-zinc-900 dark:[&_a]:text-zinc-100 [&_a]:underline [&_a]:underline-offset-2
        [&_hr]:my-8 [&_hr]:border-zinc-200 dark:[&_hr]:border-zinc-800
      "
    >
      <ReactMarkdown components={mdComponents}>{source}</ReactMarkdown>
    </div>
  );
}
