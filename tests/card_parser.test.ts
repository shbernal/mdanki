import { describe, expect, it } from "vitest";

import { settings } from "../src/configs/settings.js";
import { CardParser } from "../src/parsers/card_parser.js";

describe("CardParser", () => {
  it("parses front and back with tags", async () => {
    const parser = new CardParser(settings);
    const card = await parser.parse("Front\n%\nBack\n[#tag]()");

    expect(card?.front).toContain("Front");
    expect(card?.back).toContain("Back");
    expect(card?.tags).toEqual(["tag"]);
  });

  it("returns null for empty card", async () => {
    const parser = new CardParser(settings);
    const card = await parser.parse("");
    expect(card).toBeNull();
  });
});
