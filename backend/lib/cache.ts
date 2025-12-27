import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { config } from './config.js';
import { logger } from './logger.js';

type CacheValue = any;

interface CacheEntry {
	value: CacheValue;
	freshUntil: number;
}

export interface CacheResult {
	data: CacheValue;
	stale: boolean;
}

export class StockCache {
	private redis: Redis | null = null;
	private memoryCache: LRUCache<string, CacheEntry>;
	private useRedis: boolean = false;
	private readonly KEY_PREFIX = 'stock-app:';

	constructor() {
		// Initialize LRU memory cache
		// Max 500 items, default TTL 1 hour (can be overridden per set)
		this.memoryCache = new LRUCache({
			max: 500,
			ttl: 1000 * 60 * 60,
			allowStale: false,
		});

		if (config.REDIS_URL) {
			logger.info('Initializing Redis connection...');
			// ioredis handles auto-reconnect by default
			this.redis = new Redis(config.REDIS_URL, {
				retryStrategy: (times) => {
					// Exponential backoff with cap
					return Math.min(times * 50, 2000);
				},
				maxRetriesPerRequest: 3,
				lazyConnect: true // Don't block app start
			});

			this.redis.on('error', (err) => {
				logger.error({ err }, 'Redis connection error');
			});

			this.redis.on('connect', () => {
				logger.info('Redis Connected!');
				this.useRedis = true;
			});

			// Initial non-blocking connect attempt
			this.redis.connect().catch(e => {
				logger.error({ err: e }, 'Initial Redis connect failed (will retry)');
			});
		} else {
			logger.info('No REDIS_URL found. Using in-memory cache.');
		}
	}

	/**
	 * Expose the underlying Redis client for other modules (e.g. rate limiter)
	 */
	get client(): Redis | null {
		return this.redis;
	}

	async get(key: string): Promise<CacheResult | null> {
		const namespacedKey = this.KEY_PREFIX + key;
		let entry: CacheEntry | null = null;

		// Circuit Breaker: Try Redis if connected
		if (this.useRedis && this.redis?.status === 'ready') {
			try {
				const raw = await this.redis.get(namespacedKey);
				if (raw) {
					entry = JSON.parse(raw);
				}
			} catch (e) {
				logger.warn({ key: namespacedKey, err: e }, 'Redis get failed, falling back to memory');
			}
		}

		// Memory Fallback (L1)
		if (!entry) {
			entry = this.memoryCache.get(namespacedKey) || null;
		}

		if (!entry) return null;

		return {
			data: entry.value,
			stale: Date.now() > entry.freshUntil
		};
	}

	/**
	 * @param ttlSeconds - Duration to consider data 'fresh'
	 * @param maxAgeSeconds - Hard limit for storage in Redis (default 60 days)
	 */
	async set(key: string, value: CacheValue, ttlSeconds: number, maxAgeSeconds: number = 60 * 60 * 24 * 60): Promise<void> {
		const namespacedKey = this.KEY_PREFIX + key;
		const entry: CacheEntry = {
			value,
			freshUntil: Date.now() + (ttlSeconds * 1000)
		};

		// Always write to Memory (L1) for fast fallback
		this.memoryCache.set(namespacedKey, entry, { ttl: ttlSeconds * 1000 });

		// Try writing to Redis (L2) with MaxAge (Hard Limit)
		if (this.useRedis && this.redis?.status === 'ready') {
			try {
				await this.redis.set(namespacedKey, JSON.stringify(entry), 'EX', maxAgeSeconds);
			} catch (e) {
				logger.warn({ key: namespacedKey, err: e }, 'Redis set failed, data saved to memory only');
			}
		}
	}
}

export const cache = new StockCache();
