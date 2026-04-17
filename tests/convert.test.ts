import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  convertMarkdownToAnkiDeck,
  TARGET_REQUIRED_MESSAGE,
} from "../src/index.js";
import Transformer from "../src/transformer.js";

describe("convertMarkdownToAnkiDeck", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  const createTempDir = async (prefix: string): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  };

  it("derives a default target when not provided for a file source", async () => {
    const workingDir = await createTempDir("mdanki-convert-working-");
    const sourceDir = await createTempDir("mdanki-convert-source-");
    const sourcePath = path.join(sourceDir, "deck.md");
    await fs.writeFile(sourcePath, "# Deck");
    const transformSpy = vi
      .spyOn(Transformer.prototype, "transform")
      .mockResolvedValue();

    const targetPath = await convertMarkdownToAnkiDeck(sourcePath, {
      cwd: workingDir,
    });

    expect(targetPath).toBe(path.join(workingDir, "deck.apkg"));
    expect(transformSpy).toHaveBeenCalledTimes(1);
  });

  it("uses a provided target when supplied", async () => {
    const workingDir = await createTempDir("mdanki-convert-working-");
    const sourcePath = path.join(workingDir, "deck.md");
    await fs.writeFile(sourcePath, "# Deck");
    const target = path.join(workingDir, "custom.apkg");
    const transformSpy = vi
      .spyOn(Transformer.prototype, "transform")
      .mockResolvedValue();

    const targetPath = await convertMarkdownToAnkiDeck(sourcePath, { target });

    expect(targetPath).toBe(target);
    expect(transformSpy).toHaveBeenCalledTimes(1);
  });

  it("throws when target is missing for a directory source", async () => {
    const sourceDir = await createTempDir("mdanki-convert-dir-");

    await expect(convertMarkdownToAnkiDeck(sourceDir)).rejects.toThrow(
      TARGET_REQUIRED_MESSAGE,
    );
  });
});
