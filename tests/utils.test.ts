import { describe, expect, it } from 'vitest';

import {
  deepMerge,
  getExtensionFromUrl,
  sanitizeString,
  trimArray,
  trimArrayEnd,
  trimArrayStart,
} from '../src/utils.js';

describe('utils', () => {
  it('sanitizes strings', () => {
    expect(sanitizeString(' tag ')).toEqual('tag');
    expect(sanitizeString('tag 1')).toEqual('tag_1');
  });

  it('trims arrays', () => {
    const array = [null, 1, ''] as unknown[];
    expect(trimArray(array)).toEqual([1]);
    expect(trimArrayStart(array)).toEqual([1, '']);
    expect(trimArrayEnd(array)).toEqual([null, 1]);
  });

  it('gets extension from url', () => {
    expect(getExtensionFromUrl('http://example.com/image.png')).toEqual('.png');
  });

  it('deep merges objects', () => {
    const merged = deepMerge(
      { a: 1, nested: { value: 1 } },
      { nested: { value: 2 }, b: 3 },
    );
    expect(merged).toEqual({ a: 1, nested: { value: 2 }, b: 3 });
  });
});
