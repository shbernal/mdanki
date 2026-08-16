import fs from "node:fs/promises";
import path from "node:path";

import { BaseParser } from "./base_parser.js";
import Media from "../models/media.js";
import { diagnostic, type Diagnostic } from "../spec/diagnostics.js";
import { getExtensionFromUrl, replaceAsync } from "../utils.js";

const DEFAULT_REMOTE_FETCH_TIMEOUT_MS = 10_000;

export interface MediaParserOptions {
  allowRemoteMedia?: boolean;
  remoteFetchTimeoutMs?: number;
  [key: string]: unknown;
}

export class MediaParser extends BaseParser<
  string,
  MediaParserOptions,
  string
> {
  private source: string;

  private mediaList: Media[] = [];

  private diagnosticList: Diagnostic[] = [];

  private cardIndex: number | null = null;

  private srcRe = new RegExp('src="([^"]*?)"', "g");

  constructor(source: string, options: MediaParserOptions = {}) {
    super({
      allowRemoteMedia: true,
      remoteFetchTimeoutMs: DEFAULT_REMOTE_FETCH_TIMEOUT_MS,
      ...options,
    });
    this.source = source;
  }

  get media(): Media[] {
    return this.mediaList;
  }

  get diagnostics(): Diagnostic[] {
    return this.diagnosticList;
  }

  /**
   * @param cardIndex the card this side belongs to, so that an image which cannot be
   *   resolved can say which card it was in.
   */
  parse(side: string, cardIndex: number | null = null): Promise<string> {
    this.cardIndex = cardIndex;
    return replaceAsync(side, this.srcRe, this.replacer.bind(this));
  }

  private async replacer(match: string, p1 = ""): Promise<string> {
    /* Read synchronously, before the first await: replaceAsync starts every replacement
       for a side in one pass, so the field is only stable at call time. */
    const cardIndex = this.cardIndex;

    let resolved: { data: Buffer; fileExt: string };

    try {
      resolved = this.isRemoteSource(p1)
        ? await this.fetchRemoteMedia(p1)
        : await this.readLocalMedia(p1);
    } catch (error) {
      /* An image that will not resolve is a quality loss, not a parse failure (§7), and
         a consumer may not refuse a whole file over one card (§3.1). So the reference is
         left as the author wrote it and the loss is named: dropping it in silence is the
         one thing §3.3 forbids outright. */
      this.diagnosticList.push(
        diagnostic(
          "unresolved-image",
          `the image "${p1}" could not be resolved (${
            error instanceof Error ? error.message : String(error)
          }). It stays in the card as written and is not in the package.`,
          cardIndex,
        ),
      );

      return match;
    }

    const media = new Media(resolved.data);
    media.fileName = `${media.checksum}${resolved.fileExt}`;

    this.addMedia(media);

    return `src="${media.fileName}"`;
  }

  private addMedia(media: Media) {
    const hasMedia = this.mediaList.some(
      (item) => item.checksum === media.checksum,
    );
    if (hasMedia) return;

    this.mediaList.push(media);
  }

  private isRemoteSource(src: string): boolean {
    return /^https?:\/\//.test(src);
  }

  private async fetchRemoteMedia(
    src: string,
  ): Promise<{ data: Buffer; fileExt: string }> {
    if (!this.options.allowRemoteMedia) {
      throw new Error(
        `Remote media fetching is disabled. Remove or download the asset manually: ${src}`,
      );
    }

    const timeoutMs =
      this.options.remoteFetchTimeoutMs ?? DEFAULT_REMOTE_FETCH_TIMEOUT_MS;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(src, { signal: controller.signal });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const arrayBuffer = await resp.arrayBuffer();
      return {
        data: Buffer.from(arrayBuffer),
        fileExt: getExtensionFromUrl(src),
      };
    } catch (error) {
      const isAbortError =
        error instanceof Error && error.name === "AbortError";
      const reason = error instanceof Error ? error.message : String(error);
      const suffix = isAbortError
        ? `request timed out after ${timeoutMs}ms`
        : reason;
      throw new Error(`Failed to download media from ${src}: ${suffix}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readLocalMedia(
    src: string,
  ): Promise<{ data: Buffer; fileExt: string }> {
    const filePath = path.resolve(path.dirname(this.source), src);
    const fileExt = path.extname(filePath);

    try {
      const data = await fs.readFile(filePath);
      return { data, fileExt };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read media file at ${filePath}: ${reason}`);
    }
  }
}
