import type { Config } from "./configs/index.js";

/*
 * The next major replaces the two syntaxes that only mdanki has ever accepted: the
 * `%` front/back separator becomes a `***` line, and `[#tag]` lines become bare
 * `#tag` tokens. Neither change produces an error on an existing file — a `%` line
 * just becomes body text, and a `[#tag]` line becomes a visible line in the answer —
 * so a file that quietly stops meaning what it meant is the whole risk of that
 * release. This module exists to spend one release warning about it.
 *
 * Delete it in the release that makes the change, along with the two settings it
 * reads. It has no other callers and no reason to outlive them.
 */

const NEXT_MAJOR = "the next major version";

/** Detection reads the same settings the parser splits on, so the two cannot drift. */
export function collectDeprecationWarnings(
  source: string,
  markdown: string,
  config: Config,
): string[] {
  const warnings: string[] = [];
  const lines = markdown.split("\n").map((line) => line.trimEnd());

  const separatorRe = new RegExp(`^${config.card.frontBackSeparator}$`);
  const separatorLine = lines.findIndex((line) => separatorRe.test(line));
  if (separatorLine !== -1) {
    warnings.push(
      `${source}:${separatorLine + 1}: the "${config.card.frontBackSeparator}" front/back separator is deprecated ` +
        `and stops being recognized in ${NEXT_MAJOR}, where a line of exactly "***" separates ` +
        `the front from the back. Until then this line still splits the card; afterwards it ` +
        `becomes part of the answer.`,
    );
  }

  const tagRe = new RegExp(config.card.tagPattern);
  const tagLine = lines.findIndex((line) => tagRe.test(line));
  if (tagLine !== -1) {
    warnings.push(
      `${source}:${tagLine + 1}: "[#tag]" tag lines are deprecated and stop being recognized in ` +
        `${NEXT_MAJOR}, where tags are written as bare "#tag". Until then this line still ` +
        `sets the card's tags; afterwards it becomes visible text in the answer.`,
    );
  }

  return warnings;
}
