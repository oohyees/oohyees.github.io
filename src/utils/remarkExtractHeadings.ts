/**
 * Extracts h2/h3 headings from the MDAST and injects them into frontmatter
 * as `headings: [{ depth: 2|3, text: string, id: string }]`.
 */
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";
import { slugifyStr } from "./slugify";

const tocLabelPattern = /^(table\s+of\s+contents?|目\s*录)$/i;

export const remarkExtractHeadings = (): any => {
  return (tree: any, file: any) => {
    const headings: { depth: number; text: string; id: string }[] = [];

    visit(tree, "heading", (node: any) => {
      if (node.depth === 2 || node.depth === 3) {
        const text = toString(node);
        if (tocLabelPattern.test(text)) return;
        const id = slugifyStr(text);
        headings.push({ depth: node.depth, text, id });
      }
    });

    file.data.astro = {
      ...file.data.astro,
      frontmatter: {
        ...(file.data.astro?.frontmatter || {}),
        headings,
      },
    };
  };
};
