import { describe, expect, it } from "vitest";

import { parseDeck } from "../../src/spec/deck_parser.js";

/*
 * The conformance corpus covers the format itself; what is here is the handful of cases
 * the corpus cannot reach, plus the traps specific to a line scanner.
 */

const deck = (...lines: string[]) => parseDeck(lines.join("\n"));

describe("parseDeck", () => {
  it("takes the deck title from the first # heading", () => {
    const parsed = deck(
      "# French verbs",
      "",
      "## aboutir",
      "",
      "- to result in",
    );

    expect(parsed.title).toBe("French verbs");
    expect(parsed.titleSource).toBe("heading");
    expect(parsed.cards).toHaveLength(1);
  });

  it("reports no title rather than inventing one", () => {
    const parsed = deck("## aboutir", "", "- to result in");

    expect(parsed.title).toBeNull();
    expect(parsed.titleSource).toBe("none");
  });

  it("ends a card at a deeper heading of depth 2 and not at a blank line", () => {
    const parsed = deck(
      "## one",
      "",
      "- first",
      "",
      "",
      "- still first",
      "",
      "## two",
      "",
      "- second",
    );

    expect(parsed.cards).toHaveLength(2);
    expect(parsed.cards[0].back).toBe("- first\n\n\n- still first");
  });

  it("keeps a heading of depth 3 as body content", () => {
    const parsed = deck("## one", "", "### detail", "", "- a");

    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].back).toBe("### detail\n\n- a");
  });

  it("does not read #tag as a heading", () => {
    const parsed = deck("## one", "", "#french");

    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].cardTags).toEqual(["french"]);
  });

  it("strips an ATX closing sequence from the heading text", () => {
    const parsed = deck("## le subjonctif ##", "", "- a mood");

    expect(parsed.cards[0].headingText).toBe("le subjonctif");
  });

  it("splits at the first *** and leaves later ones in the back", () => {
    const parsed = deck(
      "## one",
      "",
      "ask",
      "",
      "***",
      "",
      "answer",
      "",
      "***",
      "",
      "more",
    );

    expect(parsed.cards[0].frontBody).toBe("ask");
    expect(parsed.cards[0].back).toBe("answer\n\n***\n\nmore");
  });

  /* The failure mode §5.3 warns a regex-based parser about: without fence tracking this
     splits the card in the middle of the code block. */
  it("ignores a *** inside a fenced code block", () => {
    const parsed = deck(
      "## one",
      "",
      "```markdown",
      "***",
      "```",
      "",
      "- a break",
    );

    expect(parsed.cards[0].frontBody).toBe("");
    expect(parsed.cards[0].back).toBe("```markdown\n***\n```\n\n- a break");
  });

  it("ignores a heading inside a fenced code block", () => {
    const parsed = deck("## one", "", "```md", "## not a card", "```");

    expect(parsed.cards).toHaveLength(1);
  });

  it("closes a fence only on a matching marker of at least the same length", () => {
    const parsed = deck(
      "## one",
      "",
      "````",
      "```",
      "## not a card",
      "````",
      "",
      "- a",
    );

    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].back).toContain("## not a card");
  });

  it("treats other thematic breaks as content", () => {
    const parsed = deck("## one", "", "ask", "", "---", "", "answer");

    expect(parsed.cards[0].frontBody).toBe("");
    expect(parsed.cards[0].back).toBe("ask\n\n---\n\nanswer");
  });

  it("does not split on an indented or quoted ***", () => {
    const parsed = deck("## one", "", "- item", "  ***", "", "> ***");

    expect(parsed.cards[0].frontBody).toBe("");
  });

  it("keeps a card with a front and no body", () => {
    const parsed = deck(
      "## un mot",
      "",
      "## une définition",
      "",
      "- elle suit",
    );

    expect(parsed.cards).toHaveLength(2);
    expect(parsed.cards[0].back).toBe("");
  });

  it("skips a card whose heading is empty and says so", () => {
    const parsed = deck(
      "## one",
      "",
      "- a",
      "",
      "##",
      "",
      "- orphaned",
      "",
      "## two",
      "",
      "- b",
    );

    expect(parsed.cards.map((card) => card.headingText)).toEqual([
      "one",
      "two",
    ]);
    expect(parsed.diagnostics.map(({ code }) => code)).toEqual([
      "malformed-card-skipped",
    ]);
  });

  it("ends a card at a second # and drops what follows it", () => {
    const parsed = deck(
      "# Deck",
      "",
      "## one",
      "",
      "- a",
      "",
      "# Later",
      "",
      "belongs to no card",
      "",
      "## two",
      "",
      "- b",
    );

    expect(parsed.cards.map((card) => card.back)).toEqual(["- a", "- b"]);
    expect(parsed.diagnostics.map(({ code }) => code)).toEqual(["stray-h1"]);
  });

  it("keeps the preamble out of every card", () => {
    const parsed = deck(
      "# Deck",
      "",
      "An introduction.",
      "",
      "## one",
      "",
      "- a",
    );

    expect(parsed.preamble).toBe("An introduction.");
    expect(parsed.cards[0].back).toBe("- a");
  });

  it("unions file and card tags without duplicating", () => {
    const parsed = parseDeck(
      [
        "---",
        "tags:",
        "  - french",
        "---",
        "",
        "## one",
        "",
        "#french #mood",
      ].join("\n"),
    );

    expect(parsed.fileTags).toEqual(["french"]);
    expect(parsed.cards[0].cardTags).toEqual(["french", "mood"]);
    expect(parsed.cards[0].tags).toEqual(["french", "mood"]);
  });

  it("collects images with their alt text", () => {
    const parsed = deck(
      "## one",
      "",
      "![A tree](./img/tree.png)",
      "",
      "![](remote.png)",
    );

    expect(parsed.cards[0].images).toEqual([
      { alt: "A tree", src: "./img/tree.png" },
      { alt: "", src: "remote.png" },
    ]);
  });

  it("returns a deck with no cards rather than an error", () => {
    const parsed = deck("# Deck", "", "Only prose here.");

    expect(parsed.cards).toEqual([]);
    expect(parsed.diagnostics).toEqual([]);
  });
});
