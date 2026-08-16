/*
 * A line scan of a deck, with just enough CommonMark to know what is code.
 *
 * Every construct Flashcard Markdown adds is line-anchored — an ATX heading, a line of
 * exactly `***` — so a scanner reports byte-exact source slices without reconstructing
 * them from an abstract syntax tree. The one thing a scanner cannot do unaided is know
 * it is inside a fence, which is what this module adds; §5.3 makes that mandatory,
 * since a `***` inside a fenced block is content and splitting there would cut the card
 * mid-fence.
 *
 * The converse trap is worth stating too: a parser working from an AST sees a
 * thematic-break node and cannot tell whether `***`, `---` or `___` produced it, so it
 * must go back to the source anyway.
 */

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/* `#` must be followed by a space or end the line; `#tag` is a paragraph, not a
   heading, in CommonMark and therefore here. */
const HEADING = /^(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;

/* The closing sequence of an ATX heading: `## Title ##` has the text `Title`. */
const CLOSING_SEQUENCE = /[ \t]+#+$/;

/** A line of exactly `***`. Indentation, a list marker or a `>` all fail this. */
const SEPARATOR = "***";

export interface ScannedLine {
  text: string;
  /** Inside a fenced code block, delimiters included. */
  inCode: boolean;
  heading: { depth: number; text: string } | null;
  isSeparator: boolean;
}

export function scanLines(lines: string[]): ScannedLine[] {
  let fence: { marker: string; length: number } | null = null;

  return lines.map((text) => {
    const fenceMatch = FENCE.exec(text);

    if (fence) {
      const closes =
        fenceMatch !== null &&
        fenceMatch[1].startsWith(fence.marker) &&
        fenceMatch[1].length >= fence.length &&
        fenceMatch[2].trim() === "";

      if (closes) fence = null;

      return { text, inCode: true, heading: null, isSeparator: false };
    }

    if (fenceMatch) {
      fence = { marker: fenceMatch[1][0], length: fenceMatch[1].length };
      return { text, inCode: true, heading: null, isSeparator: false };
    }

    const headingMatch = HEADING.exec(text);
    if (headingMatch) {
      return {
        text,
        inCode: false,
        heading: {
          depth: headingMatch[1].length,
          text: (headingMatch[2] ?? "").replace(CLOSING_SEQUENCE, "").trim(),
        },
        isSeparator: false,
      };
    }

    return {
      text,
      inCode: false,
      heading: null,
      isSeparator: text === SEPARATOR,
    };
  });
}

/**
 * Joins lines back into a source slice, dropping only leading and trailing blank
 * lines — the single normalization the conformance corpus allows.
 */
export function toSlice(lines: string[]): string {
  let start = 0;
  let end = lines.length;

  while (start < end && !lines[start].trim()) start += 1;
  while (end > start && !lines[end - 1].trim()) end -= 1;

  return lines.slice(start, end).join("\n");
}
