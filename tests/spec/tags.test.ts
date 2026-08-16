import { describe, expect, it } from "vitest";

import { stripTagOnlyLines } from "../../src/spec/render.js";
import { isTagsOnlyLine, tagsInLine, toAnkiTags } from "../../src/spec/tags.js";

describe("tagsInLine", () => {
  it("reads a bare tag and its nesting", () => {
    expect(tagsInLine("#french/grammar and #verbs")).toEqual([
      "french/grammar",
      "verbs",
    ]);
  });

  it("rejects an all-numeric tag and accepts a leading digit", () => {
    expect(tagsInLine("#42 and #1st-declension")).toEqual(["1st-declension"]);
  });

  it("ignores a trailing # and a tag inside a code span", () => {
    expect(tagsInLine("`C#` and `#include <stdio.h>` and C#")).toEqual([]);
  });

  it("ignores a # that does not open the token", () => {
    expect(tagsInLine("https://example.org/page#section")).toEqual([]);
  });
});

describe("isTagsOnlyLine", () => {
  it("is true for a line of nothing but tags", () => {
    expect(isTagsOnlyLine("#french #grammar/mood")).toBe(true);
  });

  it("is false for a tag inside a sentence", () => {
    expect(isTagsOnlyLine("The #verbs group takes être.")).toBe(false);
  });

  it("is false for a blank line", () => {
    expect(isTagsOnlyLine("   ")).toBe(false);
  });
});

describe("stripTagOnlyLines", () => {
  it("removes a tags line and keeps an inline tag where it stands", () => {
    const markdown = [
      "The #verbs group of motion.",
      "",
      "#french #grammar",
    ].join("\n");

    expect(stripTagOnlyLines(markdown)).toBe("The #verbs group of motion.");
  });

  it("leaves a tags-looking line inside a fence alone", () => {
    const markdown = ["```sh", "#!/bin/sh", "```"].join("\n");

    expect(stripTagOnlyLines(markdown)).toBe(markdown);
  });
});

describe("toAnkiTags", () => {
  it("maps the nesting separator to Anki's", () => {
    expect(toAnkiTags(["french/grammar/mood"]).tags).toEqual([
      "french::grammar::mood",
    ]);
  });

  it("sanitizes a tag Anki would split, and says so", () => {
    const { tags, diagnostics } = toAnkiTags(["two words"]);

    expect(tags).toEqual(["two_words"]);
    expect(diagnostics.map(({ code }) => code)).toEqual(["tag-sanitized"]);
  });
});
