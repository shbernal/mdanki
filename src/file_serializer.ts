import fs from 'node:fs/promises';

import type { Config } from './configs/index.js';
import type Card from './models/card.js';
import type Media from './models/media.js';
import { CardParser } from './parsers/card_parser.js';
import { MediaParser, type MediaParserOptions } from './parsers/media_parser.js';

interface ParsedData {
  deckName: string | null;
  cards: Card[];
  media: Media[];
}

export class FileSerializer {
  private source: string;

  private config: Config;

  private mediaOptions: MediaParserOptions;

  constructor(source: string, config: Config, mediaOptions: MediaParserOptions = {}) {
    this.source = source;
    this.config = config;
    this.mediaOptions = mediaOptions;
  }

  async transform(): Promise<ParsedData> {
    const mdString = await fs.readFile(this.source, 'utf8');
    return this.splitByCards(mdString);
  }

  private async splitByCards(mdString: string): Promise<ParsedData> {
    let rawCards = mdString
      .split(new RegExp(this.config.card.separator, 'm'))
      .map((line) => line.trim());

    const deckName = this.deckName(rawCards);

    rawCards = rawCards.filter((str) => !str.startsWith(this.config.deck.titleSeparator));

    const cardParser = new CardParser(this.config);
    const dirtyCards = await Promise.all(rawCards.map((str) => cardParser.parse(str)));
    const cards = dirtyCards.filter((card): card is Card => Boolean(card?.front && card?.back));

    const media = await this.mediaFromCards(cards);

    return {
      deckName,
      cards,
      media,
    };
  }

  private deckName(rawCards: string[]): string | null {
    const titleRe = new RegExp(this.config.deck.titleSeparator);
    const deckName = rawCards.find((str) => Boolean(titleRe.exec(str)));

    if (!deckName) return null;

    titleRe.lastIndex = 0;
    return deckName.replace(/(#\s|\n)/g, '');
  }

  private async mediaFromCards(cards: Card[]): Promise<Media[]> {
    const mediaParser = new MediaParser(this.source, this.mediaOptions);

    for (const card of cards) {
      card.front = await mediaParser.parse(card.front);
      card.back = await mediaParser.parse(card.back);
    }

    return mediaParser.media;
  }
}
