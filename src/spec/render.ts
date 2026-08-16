import { scanLines, toSlice } from "./scan.js";
import { isTagsOnlyLine } from "./tags.js";

/**
 * Removes the lines that are nothing but tags, leaving inline tags alone.
 *
 * §6.3 makes this line-based on purpose. Hiding every recognized token instead would
 * render "The #verbs group of motion" as "The group of motion", and would disagree with
 * Obsidian, which shows inline tags. So a tags-only line is metadata and disappears; a
 * tag inside a sentence is part of the sentence and stays.
 */
export function stripTagOnlyLines(markdown: string): string {
  const kept: string[] = [];

  for (const line of scanLines(markdown.split("\n"))) {
    if (!line.inCode && isTagsOnlyLine(line.text)) continue;

    /* Removing a tags line can leave two blank lines where the author wrote one. */
    const blank = !line.text.trim();
    if (
      blank &&
      !line.inCode &&
      kept.length > 0 &&
      !kept[kept.length - 1].trim()
    ) {
      continue;
    }

    kept.push(line.text);
  }

  return toSlice(kept);
}
