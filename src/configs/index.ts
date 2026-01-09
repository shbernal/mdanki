import fs from 'node:fs';
import path from 'node:path';

import { deepMerge } from '../utils.js';
import { settings, type Settings } from './settings.js';

export type Config = Settings;

const TEMPLATE_FILES: Record<keyof Settings['template']['formats'], string> = {
  question: 'front.html',
  answer: 'back.html',
  css: 'style.css',
};

const readTemplateSettings = (templatePath?: string): Partial<Settings> => {
  if (!templatePath) return {};

  const resolved = path.resolve(templatePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    console.warn(`Template directory not found at ${resolved}, falling back to defaults.`);
    return {};
  }

  const formats: Partial<Settings['template']['formats']> = {};

  for (const [key, fileName] of Object.entries(TEMPLATE_FILES) as [
    keyof Settings['template']['formats'],
    string,
  ][]) {
    const filePath = path.join(resolved, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`Missing template file "${fileName}" in ${resolved}, falling back to defaults.`);
      return {};
    }

    try {
      formats[key] = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.warn(`Failed to read template file "${fileName}" in ${resolved}:`, error);
      return {};
    }
  }

  if (!Object.keys(formats).length) return {};

  return { template: { formats: formats as Settings['template']['formats'] } };
};

export const loadConfigs = (templatePath?: string): Config => {
  const baseConfig: Settings = structuredClone(settings);
  return deepMerge(baseConfig, readTemplateSettings(templatePath)) as Settings;
};
