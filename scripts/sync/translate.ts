/**
 * Czech → English machine translation via DeepL API Free, cached forever
 * by content hash so each text is translated exactly once.
 *
 * Without DEEPL_API_KEY the pipeline still works: uncached texts stay null
 * and the EN pages show the Czech text with an English notice.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as deepl from 'deepl-node';

const CACHE_PATH = 'src/data/translations-cache.json';

type Cache = Record<string, string>;

export function loadCache(): Cache {
  if (!existsSync(CACHE_PATH)) return {};
  return JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as Cache;
}

export function saveCache(cache: Cache): void {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
}

export const textKey = (cs: string) => createHash('sha256').update(cs).digest('hex').slice(0, 16);

export interface Translator {
  /** Returns EN translation or null when unavailable. Fills the cache. */
  translate(cs: string): Promise<string | null>;
  cacheDirty: boolean;
}

export function createTranslator(log: (m: string) => void = console.log): Translator {
  const cache = loadCache();
  const apiKey = process.env.DEEPL_API_KEY;
  const client = apiKey ? new deepl.Translator(apiKey) : null;
  let dirty = false;

  return {
    get cacheDirty() {
      return dirty;
    },
    async translate(cs: string): Promise<string | null> {
      const trimmed = cs.trim();
      if (!trimmed) return null;
      const key = textKey(trimmed);
      if (cache[key]) return cache[key]!;
      if (!client) return null;
      try {
        const res = await client.translateText(trimmed, 'cs', 'en-GB');
        cache[key] = res.text;
        dirty = true;
        saveCache(cache);
        return res.text;
      } catch (e) {
        log(`DeepL translation failed (falling back to Czech): ${(e as Error).message}`);
        return null;
      }
    },
  };
}
