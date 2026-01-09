import type { Stats } from 'node:fs';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

export const TARGET_REQUIRED_MESSAGE = 'Target path is required when source is a directory';

export async function resolveTargetPath(
  sourcePath: string,
  rawTarget?: unknown,
  cwd: string = process.cwd(),
): Promise<string> {
  if (typeof rawTarget === 'string' && rawTarget.length > 0) {
    return path.resolve(cwd, rawTarget);
  }

  let stats: Stats;
  try {
    stats = await lstat(sourcePath);
  } catch {
    throw new Error(`${sourcePath} does not exists`);
  }

  if (stats.isDirectory()) {
    throw new Error(TARGET_REQUIRED_MESSAGE);
  }

  const stem = path.basename(sourcePath, path.extname(sourcePath));
  return path.resolve(cwd, `${stem}.apkg`);
}
