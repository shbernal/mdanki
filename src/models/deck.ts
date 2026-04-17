import AnkiExport, { type TemplateOptions } from "@shbernal/anki-apkg-export";
import fs from "node:fs/promises";
import path from "node:path";

import type Card from "./card.js";
import type Media from "./media.js";
import Template from "./template.js";
import type { Config } from "../configs/index.js";

class Deck {
  name: string;

  template: Template;

  cards: Card[];

  mediaCollection: Media[];

  private exporterPromise: ReturnType<typeof AnkiExport>;

  constructor(name: string, config: Config) {
    this.name = name;
    this.cards = [];
    this.mediaCollection = [];
    this.template = new Template(config);

    const templateOptions: TemplateOptions = {
      questionFormat: this.template.questionFormat,
      answerFormat: this.template.answerFormat,
      css: this.template.css,
    };

    this.exporterPromise = AnkiExport(this.name, templateOptions);
  }

  addCard(card: Card): void {
    this.cards.push(card);
  }

  addMedia(media: Media): void {
    this.mediaCollection.push(media);
  }

  async save(target: string): Promise<void> {
    const exporter = await this.exporterPromise;
    this.addDataToAnkiExporter(exporter);
    await this.export(exporter, target);
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
