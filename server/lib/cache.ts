import Redis from 'ioredis';

type CacheValue = any;

export class StockCache {
	private redis: Redis | null = null;
	private memoryCache: Map<string, { value: CacheValue, expires: number }> = new Map();
	private useRedis: boolean = false;
	private readonly TRASH_COLLECTION_INTERVAL = 1000 * 60 * 60; // 1 hour

	constructor() {
		if (process.env.REDIS_URL) {
			console.log('Initializing Redis connection...');
			this.redis = new Redis(process.env.REDIS_URL, {
				retryStrategy: (times) => {
					const delay = Math.min(times * 50, 2000);
					return delay;
				},
				maxRetriesPerRequest: 3,
				lazyConnect: true // Don't connect immediately, wait for first command or manual connect
			});

			this.redis.on('error', (err) => {
				console.error('Redis Error (Fallback to memory):', err.message);
				this.useRedis = false;
			});

			this.redis.on('connect', () => {
				console.log('Redis Connected!');
				this.useRedis = true;
			});

			// Attempt connection
			this.redis.connect().catch(() => {
				this.useRedis = false;
			});

		} else {
			console.log('No REDIS_URL found. Using in-memory cache.');
		}

		// Cleanup memory cache periodically
		setInterval(() => this.cleanupMemory(), this.TRASH_COLLECTION_INTERVAL);
	}

	async get(key: string): Promise<CacheValue | null> {
		if (this.useRedis && this.redis) {
			try {
				const data = await this.redis.get(key);
				if (data) {
					return JSON.parse(data);
				}
			} catch (e) {
				// Fallback will naturally happen if we return null or specific handling?
				// If Redis fails mid-operation, we might want to check memory.
				// For simplicity, if Redis fetch fails, we assume miss or transient error.
				console.warn('Redis get failed, falling back to memory/miss');
			}
		}

		// Memory Fallback
		const cached = this.memoryCache.get(key);
		if (cached) {
			if (Date.now() < cached.expires) {
				return cached.value;
			} else {
				this.memoryCache.delete(key);
			}
		}
		return null;
	}

	async set(key: string, value: CacheValue, ttlSeconds: number): Promise<void> {
		// Always save to memory as backup? Or only if Redis not working?
		// Let's prioritize Redis, use memory if Redis isn't active.

		if (this.useRedis && this.redis) {
			try {
				await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
				return;
			} catch (e) {
				console.warn('Redis set failed, saving to memory');
			}
		}

		// Save to memory
		this.memoryCache.set(key, {
			value,
			expires: Date.now() + (ttlSeconds * 1000)
		});
	}

	private cleanupMemory() {
		const now = Date.now();
		for (const [key, item] of this.memoryCache.entries()) {
			if (now > item.expires) {
				this.memoryCache.delete(key);
			}
		}
	}
}

export const cache = new StockCache();
