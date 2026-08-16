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

  it("reports the image rather than downloading it when remote media is disabled", async () => {
    const parser = new MediaParser(path.join(tmpDir, "card.md"), {
      allowRemoteMedia: false,
    });

    const html = await parser.parse('<img src="http://example.com/test.jpg">');

    expect(html).toBe('<img src="http://example.com/test.jpg">');
    expect(parser.media).toHaveLength(0);
    expect(parser.diagnostics.map(({ code }) => code)).toEqual([
      "unresolved-image",
    ]);
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

    await parser.parse('<img src="http://slow.example.com/test.jpg">');

    expect(abortSpy).toHaveBeenCalled();
    expect(parser.diagnostics[0].code).toBe("unresolved-image");
    expect(parser.diagnostics[0].message).toMatch(/timed out/i);

    vi.unstubAllGlobals();
  });

  /* §7 and §3.1 together: an image that will not resolve is a quality loss, not a
     reason to refuse the file. The reference survives so the user can see what was
     meant, and the diagnostic is what keeps the loss from being silent. */
  it("keeps the reference and reports a local image it cannot read", async () => {
    const parser = new MediaParser(path.join(tmpDir, "card.md"));
    const missing = path.join(tmpDir, "missing.png");

    const html = await parser.parse(`<img src="${missing}">`);

    expect(html).toBe(`<img src="${missing}">`);
    expect(parser.media).toHaveLength(0);
    expect(parser.diagnostics).toHaveLength(1);
    expect(parser.diagnostics[0].code).toBe("unresolved-image");
    expect(parser.diagnostics[0].message).toContain(missing);
  });

  it("attributes an unresolved image to the card it was given", async () => {
    const parser = new MediaParser(path.join(tmpDir, "card.md"));

    await parser.parse(`<img src="${path.join(tmpDir, "missing.png")}">`, 2);

    expect(parser.diagnostics[0].cardIndex).toBe(2);
  });
});
