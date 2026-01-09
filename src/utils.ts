export function sanitizeString(str: string): string {
  return str.trim().replace(/\s/g, '_');
}

export function trimArrayStart<T>(array: T[]): T[] {
  const trimmed: T[] = [];
  let added = false;

  for (const item of array) {
    if (item || added) {
      trimmed.push(item);
      added = true;
    }
  }

  return trimmed;
}

export function trimArrayEnd<T>(array: T[]): T[] {
  const trimmed: T[] = [];
  let added = false;

  for (const item of [...array].reverse()) {
    if (item || added) {
      trimmed.unshift(item);
      added = true;
    }
  }

  return trimmed;
}

export function trimArray<T>(array: T[]): T[] {
  return trimArrayEnd(trimArrayStart(array));
}

export function getExtensionFromUrl(url: string): string {
  const extension = url
    .split(/[#?]/)[0]
    .split('.')
    .pop()
    ?.trim();

  return extension ? `.${extension}` : '';
}

type AsyncReplacer = (match: string, ...args: (string | undefined)[]) => Promise<string>;

export async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: AsyncReplacer,
): Promise<string> {
  const tasks: Promise<string>[] = [];

  str.replace(regex, (match: string, ...args: unknown[]) => {
    const captures = args.slice(0, -2);
    tasks.push(asyncFn(match, ...(captures as (string | undefined)[])));
    return match;
  });

  const data = await Promise.all(tasks);
  let index = 0;

  return str.replace(regex, () => {
    const replacement = data[index];
    index += 1;
    return replacement;
  });
}

type PlainObject = Record<string, unknown>;

const isObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function deepMerge<T extends object, S extends object>(base: T, override: S): T & S {
  const result: PlainObject = structuredClone(base) as PlainObject;

  Object.entries(override ?? {}).forEach(([key, value]) => {
    const existingValue = result[key];
    if (isObject(value) && isObject(existingValue)) {
      result[key] = deepMerge(existingValue, value);
      return;
    }

    result[key] = value;
  });

  return result as T & S;
}
