import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveTargetPath, TARGET_REQUIRED_MESSAGE } from '../src/cli.js';

describe('cli', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
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

  it('returns provided target when supplied', async () => {
    const workingDir = await createTempDir('mdanki-cli-working-');
    const sourcePath = path.join(workingDir, 'source.md');
    const targetPath = await resolveTargetPath(sourcePath, './custom.apkg', workingDir);

    expect(targetPath).toBe(path.resolve(workingDir, './custom.apkg'));
  });

  it('builds default target in current working directory for a file source', async () => {
    const workingDir = await createTempDir('mdanki-cli-working-');
    const sourceDir = await createTempDir('mdanki-cli-source-');
    const sourcePath = path.join(sourceDir, 'deck.md');
    await fs.writeFile(sourcePath, '# Deck');

    const targetPath = await resolveTargetPath(sourcePath, undefined, workingDir);
    expect(targetPath).toBe(path.join(workingDir, 'deck.apkg'));
  });

  it('throws when target is missing for a directory source', async () => {
    const sourceDir = await createTempDir('mdanki-cli-dir-');

    await expect(resolveTargetPath(sourceDir)).rejects.toThrow(TARGET_REQUIRED_MESSAGE);
  });
});
