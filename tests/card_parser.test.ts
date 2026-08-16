import { describe, expect, it } from "vitest";

import { settings } from "../src/configs/settings.js";
import { CardParser } from "../src/parsers/card_parser.js";
import type { SpecCard } from "../src/spec/deck_parser.js";

const card = (overrides: Partial<SpecCard> = {}): SpecCard => ({
  headingText: "le subjonctif",
  frontBody: "",
  back: "- a mood",
  cardTags: [],
  tags: [],
  images: [],
  ...overrides,
});

describe("CardParser", () => {
  it("renders the heading and the front body as the front", async () => {
    const parser = new CardParser(settings);
    const rendered = await parser.parse(
      card({ frontBody: "Conjugate this tense." }),
    );

    expect(rendered.front).toContain("le subjonctif");
    expect(rendered.front).toContain("Conjugate this tense.");
    expect(rendered.back).toContain("a mood");
  });

  /* §6.3: a line of nothing but tags is metadata and must not reach an Anki field,
     while a tag inside a sentence is part of the sentence and stays visible. */
  it("hides a tags-only line and keeps an inline tag", async () => {
    const parser = new CardParser(settings);
    const rendered = await parser.parse(
      card({
        back: "The #verbs group takes être.\n\n#french",
        tags: ["verbs", "french"],
      }),
    );

    expect(rendered.back).toContain("#verbs group");
    expect(rendered.back).not.toContain("#french");
    expect(rendered.tags).toEqual(["verbs", "french"]);
  });

  it("renders a card with no body as an empty back", async () => {
    const parser = new CardParser(settings);
    const rendered = await parser.parse(card({ back: "" }));

    expect(rendered.front).toContain("le subjonctif");
    expect(rendered.back).toBe("");
  });

  it("skips the markdown step when asked for the source", async () => {
    const parser = new CardParser(settings, { convertToHtml: false });
    const rendered = await parser.parse(card());

    expect(rendered.front).toBe("## le subjonctif");
    expect(rendered.back).toBe("- a mood");
  });
});
