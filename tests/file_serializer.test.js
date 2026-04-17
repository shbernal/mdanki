import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FileSerializer } from "../src/file_serializer.js";
import { settings } from "../src/configs/settings.js";
const tmpDir = path.join(os.tmpdir(), "mdanki-test-serializer");
const mdFile = path.join(tmpDir, "note.md");
const imageFile = path.join(tmpDir, "image.png");
beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(imageFile, Buffer.from([0, 1, 2, 3]));
  const markdown = [
    "# Deck title",
    "## Title",
    "Front line",
    "%",
    "Back line",
    `![img](./${path.basename(imageFile)})`,
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
  });
});
//# sourceMappingURL=file_serializer.test.js.map
