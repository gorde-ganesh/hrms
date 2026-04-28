import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, unknown>({
  max: 500,
  ttl: 5 * 60 * 1000,
});

export async function cachedQuery<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  const data = await fetcher();
  cache.set(key, data);
  return data;
}

export function invalidateCache(...keys: string[]): void {
  keys.forEach((k) => cache.delete(k));
}
