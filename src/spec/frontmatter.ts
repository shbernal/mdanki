import { parse as parseYaml } from "yaml";

import { diagnostic, type Diagnostic } from "./diagnostics.js";

/*
 * Flashcard Markdown §4.1. The block is optional, must be first in the file, and
 * defines exactly one key — `tags` (§6.4). Every other key is a user extension: legal,
 * ignored, and never an error. Real decks carry a `type:` that version 1 of the format
 * deliberately does not define, so treating an unknown key as a failure would break
 * files that are conformant.
 */

const DELIMITER = /^---[ \t]*$/;
const CLOSING = /^(?:---|\.\.\.)[ \t]*$/;

export interface FrontmatterResult {
  /** The parsed block, `{}` when there is none. */
  data: Record<string, unknown>;
  /** Tags from `tags`, with a leading `#` stripped. */
  fileTags: string[];
  diagnostics: Diagnostic[];
  /** The lines below the block; the whole file when there is no block. */
  body: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * §6.4: a leading `#` on a frontmatter tag is accepted and stripped, because Obsidian's
 * property editor writes them both ways and a user should not have to know which.
 */
const stripLeadingHash = (tag: string): string => tag.replace(/^#/, "");

function readFileTags(data: Record<string, unknown>): {
  fileTags: string[];
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];

  /* Obsidian removed the singular alias in 1.9. Reading it here would mean the vault
     and the flashcard tools disagree about the same file, with the vault showing no
     tags at all — so it is named rather than quietly honoured or quietly dropped. */
  if (data.tag !== undefined && data.tag !== null) {
    diagnostics.push(
      diagnostic(
        "frontmatter-tags-not-a-sequence",
        'the frontmatter key "tag" is not read as tags: Obsidian removed the ' +
          'singular alias in 1.9. Write a "tags" sequence instead.',
      ),
    );
  }

  const value = data.tags;
  if (value === undefined || value === null) {
    return { fileTags: [], diagnostics };
  }

  if (!Array.isArray(value)) {
    diagnostics.push(
      diagnostic(
        "frontmatter-tags-not-a-sequence",
        'the frontmatter key "tags" is not a sequence, so it is not read as tags. ' +
          "Obsidian stopped accepting a scalar in 1.9; write one tag per line under " +
          '"tags:".',
      ),
    );
    return { fileTags: [], diagnostics };
  }

  const fileTags = value
    .filter((tag): tag is string | number => typeof tag !== "object")
    .map((tag) => stripLeadingHash(String(tag)))
    .filter(Boolean);

  return { fileTags, diagnostics };
}

export function splitFrontmatter(lines: string[]): FrontmatterResult {
  const empty: FrontmatterResult = {
    data: {},
    fileTags: [],
    diagnostics: [],
    body: lines,
  };

  if (!lines.length || !DELIMITER.test(lines[0])) return empty;

  const closing = lines.findIndex(
    (line, index) => index > 0 && CLOSING.test(line),
  );
  if (closing === -1) return empty;

  const block = lines.slice(1, closing).join("\n");
  const body = lines.slice(closing + 1);

  let parsed: unknown;
  try {
    parsed = parseYaml(block) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      data: {},
      fileTags: [],
      diagnostics: [
        diagnostic(
          "unrepresentable-content",
          `the frontmatter block is not valid YAML and was skipped: ${reason}`,
        ),
      ],
      body,
    };
  }

  if (!isRecord(parsed)) return { ...empty, body };

  const { fileTags, diagnostics } = readFileTags(parsed);

  return { data: parsed, fileTags, diagnostics, body };
}
