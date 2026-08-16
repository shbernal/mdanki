import { describe, expect, it } from "vitest";

import { splitFrontmatter } from "../../src/spec/frontmatter.js";

const split = (...lines: string[]) => splitFrontmatter(lines);

describe("splitFrontmatter", () => {
  it("leaves a file without a block alone", () => {
    const result = split("# Deck", "", "## one");

    expect(result.data).toEqual({});
    expect(result.body).toEqual(["# Deck", "", "## one"]);
  });

  it("ignores a block that is never closed", () => {
    const result = split("---", "tags:", "  - french", "", "## one");

    expect(result.data).toEqual({});
    expect(result.body[0]).toBe("---");
  });

  /* §4.1: unknown keys are user extensions, and treating one as an error would break
     decks that are conformant — real ones carry a `type:` this version does not define. */
  it("keeps unknown keys without complaining", () => {
    const result = split("---", "type: vocabulary", "---", "## one");

    expect(result.data).toEqual({ type: "vocabulary" });
    expect(result.diagnostics).toEqual([]);
    expect(result.fileTags).toEqual([]);
  });

  it("reads an empty tags key as no tags rather than a mistake", () => {
    const result = split("---", "tags:", "---");

    expect(result.fileTags).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  /* Salvage rather than refuse: §3.1 forbids a consumer to drop a file, and §3.3
     forbids it to drop the block without saying so. */
  it("skips a block that is not YAML and says so", () => {
    const result = split("---", "tags: [unclosed", "---", "## one");

    expect(result.data).toEqual({});
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "unrepresentable-content",
    ]);
    expect(result.body).toEqual(["## one"]);
  });
});
