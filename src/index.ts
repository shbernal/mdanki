#!/usr/bin/env node
import path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { resolveTargetPath } from './cli.js';
import Transformer from './transformer.js';

const cli = yargs(hideBin(process.argv))
  .scriptName('mdanki')
  .command(
    '$0 <source> [target]',
    "Convert Markdown file into anki's apkg file for importing.",
    (command) =>
      command
        .positional('source', {
          describe: 'Path to a markdown file or directory',
          type: 'string',
        })
        .positional('target', {
          describe: 'Path to the resulting .apkg file. When omitted, the file stem is used with .apkg in the current directory.',
          type: 'string',
        }),
    async (argv) => {
      const deckArg = typeof argv.deck === 'string' ? argv.deck : undefined;
      const templateArg = typeof argv.template === 'string' ? argv.template : undefined;
      const allowRemoteMedia = argv.remoteMedia !== false;
      const remoteFetchTimeoutMs =
        typeof argv.remoteTimeout === 'number' ? argv.remoteTimeout : undefined;
      const sourcePath = path.resolve(String(argv.source));

      try {
        const targetPath = await resolveTargetPath(sourcePath, argv.target);
        const transformer = new Transformer(sourcePath, targetPath, {
          deckName: deckArg ?? null,
          templatePath: templateArg ? path.resolve(templateArg) : undefined,
          allowRemoteMedia,
          remoteFetchTimeoutMs,
        });

        await transformer.transform();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(errorMessage);
        process.exit(1);
      }
    },
  )
  .example('$0 study.md anki.apkg --deck Study', 'Convert a single markdown file')
  .option('template', {
    type: 'string',
    description: 'Template directory containing front.html, back.html and style.css',
  })
  .option('deck', {
    type: 'string',
    description: 'Deck name',
  })
  .option('remote-media', {
    type: 'boolean',
    default: true,
    description: 'Download media from remote http/https sources referenced in markdown',
  })
  .option('remote-timeout', {
    type: 'number',
    description: 'Timeout in ms when downloading remote media (default: 10000)',
  })
  .help()
  .strict();

await cli.parseAsync();
