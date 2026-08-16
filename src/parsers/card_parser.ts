import Card from "../models/card.js";
import type { SpecCard } from "../spec/deck_parser.js";
import { stripTagOnlyLines } from "../spec/render.js";
import { BaseParser } from "./base_parser.js";
import { MdParser } from "./md_parser.js";
import type { Config } from "../configs/index.js";

interface CardParserOptions extends Record<string, unknown> {
  convertToHtml?: boolean;
}

/**
 * Turns one parsed card into the two HTML fields Anki stores.
 *
 * Splitting the document is not this class's job any more — `parseDeck` owns the
 * grammar, and what arrives here is already a card. What is left is the rendering
 * decisions: the heading is part of the front (§5.3), and tags-only lines are metadata
 * that must not reach a field (§6.3).
 */
export class CardParser extends BaseParser<SpecCard, CardParserOptions, Card> {
  private mdParser: MdParser;

  constructor(
    config: Config,
    options: CardParserOptions = { convertToHtml: true },
  ) {
    super(options);
    this.mdParser = new MdParser(config, options);
  }

  async parse(card: SpecCard): Promise<Card> {
    const front = this.toMarkdown([`## ${card.headingText}`, card.frontBody]);
    const back = this.toMarkdown([card.back]);

    if (!this.options.convertToHtml) {
      return new Card(front, back, card.tags);
    }

    const [frontHtml, backHtml] = await Promise.all([
      this.mdParser.parse(front),
      this.mdParser.parse(back),
    ]);

    return new Card(frontHtml, backHtml, card.tags);
  }

  private toMarkdown(parts: string[]): string {
    return parts
      .map((part) => stripTagOnlyLines(part))
      .filter(Boolean)
      .join("\n\n");
  }
}
