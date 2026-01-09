import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadConfigs } from '../src/configs/index.js';

describe('configs', () => {
  it('loads default config when template directory is missing', () => {
    const config = loadConfigs('/tmp/non-existent-template');
    expect(config.deck.defaultName).toBe('mdanki');
  });

  it('loads template formats from directory', () => {
    const templateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdanki-template-'));
    fs.writeFileSync(path.join(templateDir, 'front.html'), '<div>front</div>');
    fs.writeFileSync(path.join(templateDir, 'back.html'), '<div>back</div>');
    fs.writeFileSync(path.join(templateDir, 'style.css'), '.card { color: red; }');

    const config = loadConfigs(templateDir);

    expect(config.template.formats.question).toContain('front');
    expect(config.template.formats.answer).toContain('back');
    expect(config.template.formats.css).toContain('color: red');
  });
});
