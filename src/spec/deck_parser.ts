import { diagnostic, type Diagnostic } from "./diagnostics.js";
import { splitFrontmatter } from "./frontmatter.js";
import { scanLines, toSlice, type ScannedLine } from "./scan.js";
import { isTagsOnlyLine, tagsInLine, uniqueTags } from "./tags.js";

/*
 * Flashcard Markdown, the whole document grammar:
 *
 *   [frontmatter] [# deck title] [preamble] [card]*
 *
 * A card begins at a `##` heading and ends at the next heading of depth <= 2 or at end
 * of file (§5.1). Nothing else ends one — not a blank line, not a thematic break, not
 * the end of a list. Every field this returns is a verbatim slice of the source,
 * normalized only by trimming leading and trailing blank lines, which is the level the
 * conformance corpus asserts at.
 */

/* Alt text is SHOULD, not MUST (§7), so the alt group matches empty. */
const IMAGE = /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

/**
 * An image as the card declares it, which is the level §7 defines images at.
 *
 * Inline form only. A reference-style image (`![alt][ref]`) is resolved by the markdown
 * renderer downstream and reaches the media pipeline as an `<img>` like any other, so
 * nothing is lost by it — it is just not visible this early.
 */
export interface SpecImage {
  alt: string;
  src: string;
}

export interface SpecCard {
  /** The heading's text, without the `## ` marker. A card's whole identity (§5.2). */
  headingText: string;
  /** Body before the first `***`; `""` when there is none. */
  frontBody: string;
  /** Body after the separator, or the whole body without one; `""` when there is none. */
  back: string;
  cardTags: string[];
  /** The effective set: file tags ∪ card tags, deduplicated (§6.1). */
  tags: string[];
  images: SpecImage[];
}

export interface ParsedDeck {
  title: string | null;
  titleSource: "heading" | "none";
  frontmatter: Record<string, unknown>;
  fileTags: string[];
  /** Content between the title and the first card; belongs to no card (§4.3). */
  preamble: string | null;
  cards: SpecCard[];
  diagnostics: Diagnostic[];
}

interface OpenCard {
  headingText: string;
  lines: ScannedLine[];
}

const imagesIn = (lines: ScannedLine[]): SpecImage[] =>
  lines
    .filter((line) => !line.inCode)
    .flatMap((line) =>
      [...line.text.matchAll(IMAGE)].map((match) => ({
        alt: match[1],
        src: match[2],
      })),
    );

const tagsIn = (lines: ScannedLine[]): string[] =>
  uniqueTags(
    lines
      .filter((line) => !line.inCode)
      .flatMap((line) => tagsInLine(line.text)),
  );

/**
 * Splits a card body at the first top-level `***`. Later ones are ordinary back
 * content — the first divides, and only the first (§5.3).
 */
function splitAtSeparator(lines: ScannedLine[]): {
  frontBody: string;
  back: string;
} {
  const at = lines.findIndex((line) => line.isSeparator && !line.inCode);

  if (at === -1) {
    return { frontBody: "", back: toSlice(lines.map((line) => line.text)) };
  }

  return {
    frontBody: toSlice(lines.slice(0, at).map((line) => line.text)),
    back: toSlice(lines.slice(at + 1).map((line) => line.text)),
  };
}

export function parseDeck(markdown: string): ParsedDeck {
  const {
    data: frontmatter,
    fileTags,
    diagnostics: frontmatterDiagnostics,
    body,
  } = splitFrontmatter(markdown.split("\n"));

  const diagnostics: Diagnostic[] = [...frontmatterDiagnostics];
  const cards: SpecCard[] = [];
  const preambleLines: ScannedLine[] = [];

  let title: string | null = null;
  let region: "preamble" | "card" | "orphan" = "preamble";
  let open: OpenCard | null = null;

  const closeCard = () => {
    if (!open) return;

    const card = open;
    open = null;

    /* The heading is mandatory and is the card's whole identity, so a card without one
       cannot be kept — but the file still loads and every other card survives, which is
       what §3.1 obliges a consumer to do. */
    if (!card.headingText) {
      diagnostics.push(
        diagnostic(
          "malformed-card-skipped",
          "a card has an empty ## heading, which is its only identity, so it was skipped.",
        ),
      );
      return;
    }

    const cardTags = tagsIn(card.lines);

    cards.push({
      headingText: card.headingText,
      ...splitAtSeparator(card.lines),
      cardTags,
      tags: uniqueTags([...fileTags, ...cardTags]),
      images: imagesIn(card.lines),
    });
  };

  for (const line of scanLines(body)) {
    const depth = line.heading?.depth ?? 0;

    if (depth === 1) {
      closeCard();

      if (title === null && !cards.length && region === "preamble") {
        title = line.heading?.text ?? "";
        continue;
      }

      /* A second `#` has no meaning in version 1 (§5.1). It ends the card before it,
         and what follows belongs to no card — deliberately unassigned so that assigning
         a meaning later is additive rather than a boundary change. */
      diagnostics.push(
        diagnostic(
          "stray-h1",
          `a second "# ${line.heading?.text ?? ""}" heading has no meaning in version 1 ` +
            "of the format; it ends the card above it and the content below it belongs " +
            "to no card.",
        ),
      );
      region = "orphan";
      continue;
    }

    if (depth === 2) {
      closeCard();
      open = { headingText: line.heading?.text ?? "", lines: [] };
      region = "card";
      continue;
    }

    if (region === "card" && open) open.lines.push(line);
    else if (region === "preamble") preambleLines.push(line);
  }

  closeCard();

  const preamble = toSlice(preambleLines.map((line) => line.text));

  /* A bare tag above the first card is neither a file tag nor a card tag in version 1.
     Dropping the preamble is conformant (§4.3); dropping a tag the user clearly meant
     as one, without a word, is what this names. */
  if (preambleLines.some((line) => !line.inCode && isTagsOnlyLine(line.text))) {
    diagnostics.push(
      diagnostic(
        "preamble-tag",
        "a tag appears above the first card, where version 1 of the format gives it no " +
          "meaning: it is neither a file tag nor a card tag. Move it into the " +
          'frontmatter under "tags" or into a card.',
      ),
    );
  }

  return {
    title,
    titleSource: title === null ? "none" : "heading",
    frontmatter,
    fileTags,
    preamble: preamble || null,
    cards,
    diagnostics,
  };
}
