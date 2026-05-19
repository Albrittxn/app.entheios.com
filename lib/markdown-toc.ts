// Builds an on-page section list from markdown — the "On this page" nav next
// to long content (Closing → Systems, Script). slugify() here must stay in
// sync with the heading ids ProseMarkdown renders.

export type Section = {
  id: string;
  label: string;
  level: 1 | 2;
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Pull H1/H2 headings out of a markdown string, in document order. Heading
// text is stripped of inline markdown (*, _, `) so labels read clean.
export function extractSections(markdown: string): Section[] {
  const out: Section[] = [];
  for (const line of markdown.split("\n")) {
    const m = /^(#{1,2})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 1 | 2;
    const label = m[2].replace(/[*_`]/g, "").trim();
    if (label) out.push({ id: slugify(label), label, level });
  }
  return out;
}
