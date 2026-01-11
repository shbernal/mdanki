import { resolveTargetPath, TARGET_REQUIRED_MESSAGE } from './cli.js';
import { loadConfigs, type Config } from './configs/index.js';
import Transformer, { type TransformerOptions } from './transformer.js';

export { Transformer, resolveTargetPath, TARGET_REQUIRED_MESSAGE, loadConfigs };
export type { TransformerOptions, Config };

export interface ConvertMarkdownToAnkiDeckOptions extends TransformerOptions {
  /**
   * Absolute or relative output path to the .apkg file.
   * If omitted and the source is a file, the target will be derived from the source name.
   */
  target?: string;
  /**
   * Working directory used when resolving the target path (defaults to process.cwd()).
   */
  cwd?: string;
}

/**
  * Convenience helper to convert markdown to an Anki deck in one call.
  */
export async function convertMarkdownToAnkiDeck(
  sourcePath: string,
  options: ConvertMarkdownToAnkiDeckOptions = {},
): Promise<string> {
  const { target: rawTarget, cwd, ...transformerOptions } = options;
  const target = await resolveTargetPath(sourcePath, rawTarget, cwd);

  const transformer = new Transformer(sourcePath, target, transformerOptions);
  await transformer.transform();

  return target;
}
