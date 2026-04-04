import Redis from 'ioredis';
import logger from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Default TTL for cached entries (seconds)
export const CACHE_TTL = 60;

let _client: Redis | null = null;

function getClient(): Redis | null {
  if (_client) return _client;
  try {
    _client = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    _client.on('connect', () =>
      logger.info('Redis connected', { url: REDIS_URL }),
    );
    _client.on('error', (err) => {
      logger.warn('Redis error — cache disabled', { message: err.message });
      _client = null;
    });

    return _client;
  } catch (err) {
    logger.warn('Redis init failed — cache disabled', { err });
    return null;
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  value: unknown,
  ttl = CACHE_TTL,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    // cache write failure is non-fatal
  }
}

export async function deleteCached(key: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // non-fatal
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // non-fatal
  }
}

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}
