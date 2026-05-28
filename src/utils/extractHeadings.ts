import GitHubSlugger from "github-slugger";

interface TocHeading {
  depth: number;
  text: string;
  id: string;
}

const tocLabelPattern = /^(table\s+of\s+contents?|目\s*录)$/i;

const slugger = new GitHubSlugger();

/** Parse ## and ### headings directly from raw markdown content. */
export function extractHeadings(raw: string): TocHeading[] {
  slugger.reset();
  const headings: TocHeading[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const depth = match[1].length;
      const text = match[2].trim();
      const plainText = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
      if (tocLabelPattern.test(plainText)) continue;
      headings.push({ depth, text, id: slugger.slug(plainText) });
    }
  }
  return headings;
}
