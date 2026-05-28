import { slugifyStr } from "./slugify";

interface TocHeading {
  depth: number;
  text: string;
  id: string;
}

const tocLabelPattern = /^(table\s+of\s+contents?|目\s*录)$/i;

/** Parse ## and ### headings directly from raw markdown content. */
export function extractHeadings(raw: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const depth = match[1].length;
      const text = match[2].trim();
      // Strip markdown link syntax to get plain text for matching
      const plainText = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
      if (tocLabelPattern.test(plainText)) continue;
      headings.push({ depth, text, id: slugifyStr(plainText) });
    }
  }
  return headings;
}
