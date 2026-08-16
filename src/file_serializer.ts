import fs from "node:fs/promises";

import type { Config } from "./configs/index.js";
import { collectLegacySyntaxWarnings } from "./legacy_syntax.js";
import type Card from "./models/card.js";
import type Media from "./models/media.js";
import { CardParser } from "./parsers/card_parser.js";
import {
  MediaParser,
  type MediaParserOptions,
} from "./parsers/media_parser.js";
import { parseDeck } from "./spec/deck_parser.js";
import type { Diagnostic } from "./spec/diagnostics.js";

interface ParsedData {
  deckName: string | null;
  cards: Card[];
  media: Media[];
  /** Everything the file said that the caller should hear about. */
  diagnostics: Diagnostic[];
  /** Free-form warnings that are not conformance diagnostics. */
  warnings: string[];
}

export class FileSerializer {
  private source: string;

  private config: Config;

  private mediaOptions: MediaParserOptions;

  constructor(
    source: string,
    config: Config,
    mediaOptions: MediaParserOptions = {},
  ) {
    this.source = source;
    this.config = config;
    this.mediaOptions = mediaOptions;
  }

  async transform(): Promise<ParsedData> {
    const mdString = await fs.readFile(this.source, "utf8");
    const deck = parseDeck(mdString);

    const cardParser = new CardParser(this.config);
    const cards = await Promise.all(
      deck.cards.map((card) => cardParser.parse(card)),
    );

    const mediaParser = new MediaParser(this.source, this.mediaOptions);

    /* Sequential on purpose: the parser attributes an unresolved image to the card it
       is given, and that attribution is only correct one card at a time. */
    for (const [index, card] of cards.entries()) {
      card.front = await mediaParser.parse(card.front, index);
      card.back = await mediaParser.parse(card.back, index);
    }

    return {
      deckName: deck.title,
      cards,
      media: mediaParser.media,
      diagnostics: [...deck.diagnostics, ...mediaParser.diagnostics],
      warnings: collectLegacySyntaxWarnings(mdString),
    };
  }
}
