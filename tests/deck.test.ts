import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { settings } from "../src/configs/settings.js";
import Card from "../src/models/card.js";
import Deck from "../src/models/deck.js";

const tempDirs: string[] = [];

const createTempDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mdanki-test-deck-"));
  tempDirs.push(dir);
  return dir;
};

const build = async (
  cards: [string, string][],
  options: { now?: number } = {},
): Promise<Buffer> => {
  const dir = await createTempDir();
  const target = path.join(dir, "deck.apkg");
  const deck = new Deck("test-deck", settings, options);

  for (const [front, back] of cards) deck.addCard(new Card(front, back));
  await deck.save(target);

  return fs.readFile(target);
};

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
});

describe("Deck", () => {
  it("warns when two cards share both a front and a back", async () => {
    const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);

    await build([
      ["Same", "Same back"],
      ["Same", "Same back"],
    ]);

    expect(warn).toHaveBeenCalledTimes(1);
    const [message] = warn.mock.calls[0] as [string];
    expect(message).toContain("1 card(s)");
    expect(message).toContain('"Same"');
  });

  /* The guid hashes the deck name and both fields, so a shared front alone does
     not merge anything. This is what makes duplicate `##` headings safe. */
  it("stays quiet when cards share a front but not a back", async () => {
    const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);

    await build([
      ["Same", "One"],
      ["Same", "Two"],
    ]);

    expect(warn).not.toHaveBeenCalled();
  });

  it("names at most three fronts and counts the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);

    await build(
      ["a", "b", "c", "d"].flatMap((letter): [string, string][] => [
        [letter, `back ${letter}`],
        [letter, `back ${letter}`],
      ]),
    );

    const [message] = warn.mock.calls[0] as [string];
    expect(message).toContain("4 card(s)");
    expect(message).toContain("and 1 more");
  });

  it("produces byte-identical output for the same clock reading", async () => {
    const cards: [string, string][] = [["Front", "Back"]];

    const first = await build(cards, { now: 1_700_000_000_000 });
    const second = await build(cards, { now: 1_700_000_000_000 });

    expect(first.equals(second)).toBe(true);
  });

  /* The exporter's database is released after save(), which is only observable
     from outside as the exporter refusing to be used again. */
  it("releases the exporter after saving", async () => {
    const dir = await createTempDir();
    const deck = new Deck("test-deck", settings);
    deck.addCard(new Card("Front", "Back"));

    await deck.save(path.join(dir, "first.apkg"));

    await expect(deck.save(path.join(dir, "second.apkg"))).rejects.toThrow(
      /closed exporter/,
    );
  });
});
