import type { CacheStats } from "@/data/types";

const CACHE_PREFIX = "yahoo-financials-cache";
const CACHE_STATS_KEY = "data:cache-stats";

export type CacheRecord<T> = {
  data: T;
  storedAt: string;
  expiresAt: string;
};

export function buildCacheKey(key: string) {
  return `${CACHE_PREFIX}:${key}`;
}

export function getCacheStats(): CacheStats {
  if (typeof localStorage === "undefined") {
    return { hits: 0, misses: 0 };
  }
  const stored = localStorage.getItem(CACHE_STATS_KEY);
  if (!stored) return { hits: 0, misses: 0 };
  try {
    return JSON.parse(stored) as CacheStats;
  } catch {
    return { hits: 0, misses: 0 };
  }
}

function setCacheStats(stats: CacheStats) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CACHE_STATS_KEY, JSON.stringify(stats));
}

export function recordCacheHit() {
  const stats = getCacheStats();
  setCacheStats({ hits: stats.hits + 1, misses: stats.misses });
}

export function recordCacheMiss() {
  const stats = getCacheStats();
  setCacheStats({ hits: stats.hits, misses: stats.misses + 1 });
}

export function setCache<T>(key: string, data: T, ttlMs: number) {
  if (typeof localStorage === "undefined") return;
  const now = Date.now();
  const record: CacheRecord<T> = {
    data,
    storedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  localStorage.setItem(buildCacheKey(key), JSON.stringify(record));
}

export function getCache<T>(key: string) {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(buildCacheKey(key));
  if (!stored) return null;
  try {
    const record = JSON.parse(stored) as CacheRecord<T>;
    const isStale = Date.now() > new Date(record.expiresAt).getTime();
    return { record, isStale };
  } catch {
    return null;
  }
}
