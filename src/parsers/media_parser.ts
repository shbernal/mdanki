import fs from "node:fs/promises";
import path from "node:path";

import { BaseParser } from "./base_parser.js";
import Media from "../models/media.js";
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

  parse(side: string): Promise<string> {
    return replaceAsync(side, this.srcRe, this.replacer.bind(this));
  }

  private async replacer(_match: string, p1 = ""): Promise<string> {
    const { data, fileExt } = this.isRemoteSource(p1)
      ? await this.fetchRemoteMedia(p1)
      : await this.readLocalMedia(p1);

    const media = new Media(data);
    media.fileName = `${media.checksum}${fileExt}`;

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
