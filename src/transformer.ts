import fg from "fast-glob";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfigs, type Config } from "./configs/index.js";
import { FileSerializer } from "./file_serializer.js";
import Deck from "./models/deck.js";
import Media from "./models/media.js";
import type { MediaParserOptions } from "./parsers/media_parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AVAILABLE_FILE_EXTENSIONS = [".md", ".markdown"];

export interface TransformerOptions {
  deckName?: string | null;
  templatePath?: string;
  allowRemoteMedia?: boolean;
  remoteFetchTimeoutMs?: number;
}

class Transformer {
  private sourcePath: string;

  private targetPath: string;

  private config: Config;

  private deckName?: string | null;

  private deck: Deck | null = null;

  private mediaOptions: MediaParserOptions;

  constructor(
    sourcePath: string,
    targetPath: string,
    options: TransformerOptions = {},
  ) {
    this.sourcePath = sourcePath;
    this.targetPath = targetPath;
    this.deckName = options.deckName;
    this.config = loadConfigs(options.templatePath);
    this.mediaOptions = {
      allowRemoteMedia: options.allowRemoteMedia,
      remoteFetchTimeoutMs: options.remoteFetchTimeoutMs,
    };
  }

  async transform(): Promise<void> {
    await this.validate();
    await this.transformToDeck();
  }

  private async transformToDeck(): Promise<void> {
    let generatedDeckName: string | null = null;
    const cards: Deck["cards"] = [];
    const media: Media[] = [];

    const stat = await fs.lstat(this.sourcePath);

    if (stat.isDirectory()) {
      const allowedExtStr = AVAILABLE_FILE_EXTENSIONS.map((ex) =>
        ex.replace(".", ""),
      ).join(",");
      const files = await fg(
        `${this.sourcePath.replace(/\\/g, "/")}/**/*.{${allowedExtStr}}`,
        {
          dot: false,
        },
      );

      for (const file of files) {
        const fileSerializer = new FileSerializer(
          file,
          this.config,
          this.mediaOptions,
        );
        const { cards: fileCards, media: fileMedia } =
          await fileSerializer.transform();
        cards.push(...fileCards);
        media.push(...fileMedia);
      }
    } else {
      const fileSerializer = new FileSerializer(
        this.sourcePath,
        this.config,
        this.mediaOptions,
      );
      const {
        deckName,
        cards: fileCards,
        media: fileMedia,
      } = await fileSerializer.transform();
      generatedDeckName = deckName;
      cards.push(...fileCards);
      media.push(...fileMedia);
    }

    if (!cards.length) {
      console.log("No cards found. Check your markdown file(s).");
      process.exit(1);
    }

    this.deck = new Deck(
      this.calculateDeckName(generatedDeckName),
      this.config,
    );

    await this.exportCards(cards, media);
  }

  private calculateDeckName(generatedName: string | null = null): string {
    return this.deckName ?? generatedName ?? this.config.deck.defaultName;
  }

  private async exportCards(
    cards: Deck["cards"],
    media: Media[],
  ): Promise<void> {
    this.addResourcesToDeck();
    this.addCardsToDeck(cards);
    this.addMediaItemsToDeck(media);

    await this.deck?.save(this.targetPath);
  }

  private addResourcesToDeck(): void {
    if (!this.deck) return;

    this.deck.addMedia(
      this.toMedia(
        "_highlight.js",
        path.resolve(__dirname, "../resources/highlight.js"),
      ),
    );
    this.deck.addMedia(
      this.toMedia(
        "_prism.js",
        path.resolve(__dirname, "../resources/prism.js"),
      ),
    );
    this.deck.addMedia(
      this.toMedia(
        "_highlight_default.css",
        path.resolve(__dirname, "../resources/default.css"),
      ),
    );
    this.deck.addMedia(
      this.toMedia(
        "_highlight_dark.css",
        path.resolve(__dirname, "../resources/dark.css"),
      ),
    );
  }

  private addCardsToDeck(cards: Deck["cards"]): void {
    cards.forEach((card) => this.deck?.addCard(card));
  }

  private addMediaItemsToDeck(items: Media[]): void {
    items.forEach((item) => this.deck?.addMedia(item));
  }

  private toMedia(fileName: string, filePath: string): Media {
    const data = fsSync.readFileSync(filePath);
    return new Media(data, fileName);
  }

  private validateExt(filePath: string): void {
    const ext = path.extname(filePath);
    if (ext && !AVAILABLE_FILE_EXTENSIONS.includes(ext)) {
      console.log(`${filePath} has not allowed extension`);
      process.exit(1);
    }
  }

  private async validatePath(checkPath: string): Promise<void> {
    try {
      await fs.access(checkPath);
    } catch {
      console.log(`${checkPath} does not exists`);
      process.exit(1);
    }
  }

  private async validate(): Promise<void> {
    await this.validatePath(this.sourcePath);
    this.validateExt(this.sourcePath);
  }
}

export default Transformer;
