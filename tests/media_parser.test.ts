import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

import { MediaParser } from "../src/parsers/media_parser.js";

const tmpDir = path.join(os.tmpdir(), "mdanki-test-media");
const localImage = path.join(tmpDir, "image.png");

beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(localImage, Buffer.from([0, 1, 2, 3]));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("MediaParser", () => {
  it("replaces local src references with hashed names", async () => {
    const parser = new MediaParser(path.join(tmpDir, "card.md"));
    const html = await parser.parse(`<img src="${localImage}">`);

    expect(html).toMatch(/src=".+\.png"/);
    expect(parser.media).toHaveLength(1);
  });

  it("downloads remote resources via fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
      statusText: "OK",
    });
    vi.stubGlobal("fetch", fetchMock);

    const parser = new MediaParser(path.join(tmpDir, "card.md"));
    const html = await parser.parse('<img src="http://example.com/test.jpg">');

    expect(html).toMatch(/\.jpg/);
    expect(fetchMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("fails fast when remote media fetching is disabled", async () => {
    const parser = new MediaParser(path.join(tmpDir, "card.md"), {
      allowRemoteMedia: false,
    });

    await expect(
      parser.parse('<img src="http://example.com/test.jpg">'),
    ).rejects.toThrow(/remote media fetching is disabled/i);
  });

  it("times out remote downloads", async () => {
    const abortSpy = vi.fn();
    const fetchMock = vi.fn((_url, { signal }: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          abortSpy();
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const parser = new MediaParser(path.join(tmpDir, "card.md"), {
      remoteFetchTimeoutMs: 5,
    });

    await expect(
      parser.parse('<img src="http://slow.example.com/test.jpg">'),
    ).rejects.toThrow(/timed out/i);
    expect(abortSpy).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("wraps local file errors with path context", async () => {
    const parser = new MediaParser(path.join(tmpDir, "card.md"));
    const missing = path.join(tmpDir, "missing.png");

    await expect(parser.parse(`<img src="${missing}">`)).rejects.toThrow(
      missing,
    );
  });
});
