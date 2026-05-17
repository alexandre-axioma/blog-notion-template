import type { TocEntry } from "./types";
import { plainText, slugify } from "./helpers";

/**
 * Walks top-level blocks and returns headings as TOC entries. Notion
 * heading_1 is treated as level 2 (since the post title owns h1) and
 * heading_2 as level 3. Heading_3 is intentionally excluded — keeps the
 * outline scannable.
 */
export function tocFromBlocks(blocks: any[]): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const block of blocks) {
    if (block.type === "heading_1") {
      const text = plainText(block.heading_1?.rich_text);
      if (text) entries.push({ id: slugify(text), text, level: 2 });
    } else if (block.type === "heading_2") {
      const text = plainText(block.heading_2?.rich_text);
      if (text) entries.push({ id: slugify(text), text, level: 3 });
    }
  }
  return entries;
}
