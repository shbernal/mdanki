import AnkiExport, { type TemplateOptions } from "@shbernal/anki-apkg-export";
import fs from "node:fs/promises";
import path from "node:path";

import type Card from "./card.js";
import type Media from "./media.js";
import Template from "./template.js";
import type { Config } from "../configs/index.js";

export interface DeckOptions {
  /**
   * The epoch-millisecond instant to build the deck at, defaulting to now. Every
   * timestamp in the archive derives from this one reading, so a fixed value makes
   * the bytes reproducible across processes.
   */
  now?: number;
}

/** Enough of a front to recognize the card by, with the markup taken back off. */
const excerpt = (html: string, limit = 60): string => {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

class Deck {
  name: string;

  template: Template;

  cards: Card[];

  mediaCollection: Media[];

  private exporterPromise: ReturnType<typeof AnkiExport>;

  constructor(name: string, config: Config, options: DeckOptions = {}) {
    this.name = name;
    this.cards = [];
    this.mediaCollection = [];
    this.template = new Template(config);

    const templateOptions: TemplateOptions = {
      questionFormat: this.template.questionFormat,
      answerFormat: this.template.answerFormat,
      css: this.template.css,
    };

    this.exporterPromise = AnkiExport(
      this.name,
      templateOptions,
      options.now === undefined ? {} : { now: options.now },
    );
  }

  addCard(card: Card): void {
    this.cards.push(card);
  }

  addMedia(media: Media): void {
    this.mediaCollection.push(media);
  }

  async save(target: string): Promise<void> {
    const exporter = await this.exporterPromise;

    /* The exporter holds a sql.js database, which is WASM memory no garbage
       collector reclaims. It also implements Symbol.dispose, so a caller compiling
       to a newer target can `using` it; this file targets ES2022, where the
       explicit call is the whole of the adoption. */
    try {
      this.warnAboutMergedCards();
      this.addDataToAnkiExporter(exporter);
      await this.export(exporter, target);
    } finally {
      exporter.close();
    }
  }

  /*
   * Anki matches notes on a guid derived from the deck name and both fields, so two
   * cards identical in front *and* back are one note however often they appear — the
   * exporter merges them without comment, and the deck comes out shorter than the
   * file. Duplicate fronts alone are unaffected: their backs differ, so their guids
   * do. Nothing here can prevent the merge, because changing how the guid is derived
   * would re-duplicate every note our users have already imported. So say it instead.
   */
  private warnAboutMergedCards(): void {
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const { front, back } of this.cards) {
      /* Joined without a separator on purpose: this has to predict the exporter's
         guid, and the concatenation is what the guid hashes. */
      const key = front + back;

      if (seen.has(key)) {
        merged.push(front);
        continue;
      }

      seen.add(key);
    }

    if (!merged.length) return;

    const shown = merged.slice(0, 3).map((front) => `"${excerpt(front)}"`);
    const rest = merged.length - shown.length;

    console.warn(
      `mdanki: ${merged.length} card(s) repeat an earlier card's front and back ` +
        `exactly, and Anki will keep one note for each pair rather than two: ` +
        `${shown.join(", ")}${rest > 0 ? ` and ${rest} more` : ""}. ` +
        `Anki identifies a note by its content, so identical cards cannot be kept ` +
        `apart; give them different backs if they are meant to be separate.`,
    );
  }

  private addDataToAnkiExporter(
    exporter: Awaited<ReturnType<typeof AnkiExport>>,
  ): void {
    this.cards.forEach((card) => {
      const { front, back, tags } = card;
      exporter.addCard(front, back, { tags });
    });

    this.mediaCollection.forEach((media) => {
      if (media.fileName) {
        exporter.addMedia(media.fileName, media.data);
      }
    });
  }

  private async export(
    exporter: Awaited<ReturnType<typeof AnkiExport>>,
    target: string,
  ): Promise<void> {
    try {
      const zip = await exporter.save();
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, zip, "binary");
      console.log(`The deck "${this.name}" has been generated in ${target}`);
    } catch (error) {
      console.log(error);
    }
  }
}

export default Deck;
