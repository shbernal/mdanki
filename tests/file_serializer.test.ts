import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { settings } from "../src/configs/settings.js";
import { FileSerializer } from "../src/file_serializer.js";

const tmpDir = path.join(os.tmpdir(), "mdanki-test-serializer");
const mdFile = path.join(tmpDir, "note.md");
const imageFile = path.join(tmpDir, "image.png");

beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(imageFile, Buffer.from([0, 1, 2, 3]));
  const markdown = [
    "# Deck title",
    "",
    "## Title",
    "",
    "Front line",
    "",
    "***",
    "",
    "Back line",
    "",
    `![img](./${path.basename(imageFile)})`,
    "",
    "#tagged",
  ].join("\n");
  await fs.writeFile(mdFile, markdown);
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("FileSerializer", () => {
  it("parses markdown into cards and media", async () => {
    const serializer = new FileSerializer(mdFile, settings);
    const result = await serializer.transform();

    expect(result.deckName).toBe("Deck title");
    expect(result.cards).toHaveLength(1);
    expect(result.media).toHaveLength(1);
    expect(result.cards[0].front).toContain("Front line");
    expect(result.cards[0].back).toContain("Back line");
    expect(result.cards[0].tags).toEqual(["tagged"]);
    expect(result.diagnostics).toEqual([]);
  });

  /* The syntaxes version 4 dropped do not fail — a "%" line simply becomes body text.
     A file that quietly stops meaning what it meant is the whole risk of that change,
     so it is named on the way past. */
  it("warns about the syntaxes this major stopped recognizing", async () => {
    const legacyFile = path.join(tmpDir, "legacy.md");
    await fs.writeFile(
      legacyFile,
      ["## Title", "", "Front", "", "%", "", "Back", "", "[#tag]()"].join("\n"),
    );

    const { warnings } = await new FileSerializer(
      legacyFile,
      settings,
    ).transform();

    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain("***");
    expect(warnings[1]).toContain("#tag");
  });
});
