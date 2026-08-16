/*
 * mdanki used to accept two syntaxes no other implementation of the format ever had:
 * a `%` line separating front from back, and a `[#tag]` line carrying tags. Version 4
 * dropped both, and neither produces an error on an existing file — a `%` line simply
 * becomes body text, and a `[#tag]` line becomes a visible line in the answer.
 *
 * A file that quietly stops meaning what it meant is the worst failure mode available
 * here, so these lines are named when they are seen. Version 3 warned that they were
 * about to change; this warns that they have, which is what a user upgrading from 2.x
 * straight to 4.x needs and never got the earlier notice of.
 *
 * Delete in version 5, by which point no one is arriving from a release that accepted
 * them.
 */

const LEGACY_SEPARATOR = /^%[ \t]*$/;
const LEGACY_TAG_LINE = /^\[#.*\]/;

export function collectLegacySyntaxWarnings(markdown: string): string[] {
  const warnings: string[] = [];
  const lines = markdown.split("\n").map((line) => line.trimEnd());

  const separatorLine = lines.findIndex((line) => LEGACY_SEPARATOR.test(line));
  if (separatorLine !== -1) {
    warnings.push(
      `line ${separatorLine + 1}: a "%" line no longer separates the front from the ` +
        `back — it is part of the answer now. A line of exactly "***" is the separator.`,
    );
  }

  const tagLine = lines.findIndex((line) => LEGACY_TAG_LINE.test(line));
  if (tagLine !== -1) {
    warnings.push(
      `line ${tagLine + 1}: a "[#tag]" line no longer sets tags — it is visible text ` +
        `in the answer now. Tags are written as bare "#tag".`,
    );
  }

  return warnings;
}
