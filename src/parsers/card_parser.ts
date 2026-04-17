import Card from "../models/card.js";
import { trimArray } from "../utils.js";
import { BaseParser } from "./base_parser.js";
import { MdParser } from "./md_parser.js";
import type { Config } from "../configs/index.js";

interface CardParserOptions extends Record<string, unknown> {
  convertToHtml?: boolean;
}

export class CardParser extends BaseParser<
  string,
  CardParserOptions,
  Card | null
> {
  private splitRe: RegExp;

  private tagRe: RegExp;

  private mdParser: MdParser;

  constructor(
    config: Config,
    options: CardParserOptions = { convertToHtml: true },
  ) {
    super(options);
    this.splitRe = new RegExp(`^${config.card.frontBackSeparator}$`, "m");
    this.tagRe = new RegExp(config.card.tagPattern);
    this.mdParser = new MdParser(config, options);
  }

  async parse(string = ""): Promise<Card | null> {
    const cardLines = string
      .split(this.splitRe)
      .map((item) => item.split("\n"))
      .map((arr) => arr.map((str) => str.trimEnd()));

    if (cardLines.length === 1 && !cardLines[0].filter((line) => line).length) {
      return null;
    }

    const { front, back, tags } = this.parseCardLines(cardLines);

    if (!this.options.convertToHtml) {
      return new Card(front.join(), back.join(), tags);
    }

    const frontHtml = await this.linesToHtml(front);
    const backHtml = await this.linesToHtml(back);

    return new Card(frontHtml, backHtml, tags);
  }

  private parseCardLines(cardLines: string[][]) {
    const front: string[] = [];
    const back: string[] = [];
    const tags: string[] = [];

    const fillBackAndTags = (line: string) => {
      if (this.tagRe.test(line)) {
        tags.push(...this.parseTags(line));
        return;
      }

      if (back.length === 0 && !line) return;
      back.push(line);
    };

    if (cardLines.length === 1) {
      trimArray(cardLines[0]).forEach((line) => {
        if (front.length === 0) {
          front.push(line);
          return;
        }

        fillBackAndTags(line);
      });
    } else {
      front.push(...cardLines[0]);
      trimArray(cardLines[1]).forEach((line) => fillBackAndTags(line));
    }

    return {
      front: trimArray(front),
      back: trimArray(back),
      tags: trimArray(tags),
    };
  }

  private parseTags(line: string): string[] {
    const data = line
      .split(" ")
      .map((str) => str.trim())
      .map((str) => {
        const parts = this.tagRe.exec(str);
        this.tagRe.lastIndex = 0;
        return parts?.[1];
      })
      .filter((str): str is string => Boolean(str));

    return data;
  }

  private async linesToHtml(lines: string[]): Promise<string> {
    const string = lines.join("\n");
    return this.mdParser.parse(string);
  }
}
