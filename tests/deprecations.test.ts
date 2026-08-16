import { describe, expect, it } from "vitest";

import { settings } from "../src/configs/settings.js";
import { collectDeprecationWarnings } from "../src/deprecations.js";

const warn = (markdown: string): string[] =>
  collectDeprecationWarnings("deck.md", markdown, settings);

describe("collectDeprecationWarnings", () => {
  it("says nothing about a file that uses neither syntax", () => {
    expect(
      warn(["## Title", "Front", "", "Back with 100% coverage"].join("\n")),
    ).toEqual([]);
  });

  it("reports a % separator line with its line number", () => {
    const warnings = warn(["## Title", "Front", "%", "Back"].join("\n"));

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("deck.md:3");
    expect(warnings[0]).toContain("***");
  });

  it("reports a [#tag] line with its line number", () => {
    const warnings = warn(
      ["## Title", "Front", "", "Back", "[#algorithms]()"].join("\n"),
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("deck.md:5");
    expect(warnings[0]).toContain("#tag");
  });

  it("reports both syntaxes independently", () => {
    expect(
      warn(["## Title", "Front", "%", "Back", "[#tag]()"].join("\n")),
    ).toHaveLength(2);
  });

  /* The parser only routes a whole line to the tag branch, so a bracketed tag
     inside a sentence is body text and its meaning does not change. */
  it("ignores a bracketed tag that is not the whole line", () => {
    expect(warn(["## Title", "Front", "", "see [#tag]()"].join("\n"))).toEqual(
      [],
    );
  });

  /* A `%` inside a sentence is not a separator either — the pattern anchors the
     whole line. Worth pinning: this is the false positive users would notice. */
  it("ignores a percent sign inside a line", () => {
    expect(warn(["## Title", "Front", "", "50% off"].join("\n"))).toEqual([]);
  });

  it("tolerates trailing whitespace on the deprecated lines", () => {
    expect(warn(["## Title", "Front", "%  ", "Back"].join("\n"))).toHaveLength(
      1,
    );
  });
});
