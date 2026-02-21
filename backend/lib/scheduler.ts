/**
 * Safe long-duration timer scheduler.
 *
 * Node.js timers use a 32-bit signed integer internally, capping at
 * 2^31 - 1 ms (~24.85 days). Any value above that silently overflows
 * to 1 ms — hammering the event loop. This module provides a
 * periodic-check approach: a safe 24-hour interval reads a last-run
 * timestamp from Redis (or in-memory fallback) and only fires the
 * callback once the desired duration has elapsed.
 */

import type Redis from 'ioredis';
import type { Logger } from 'pino';

const MAX_SAFE_TIMER_MS = 2_147_483_647; // 2^31 - 1

// How often we wake up to check whether the target interval has passed
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

const LAST_RUN_KEY = 'stock-app:warmup-last-run';
const LAST_RUN_REDIS_TTL = 60 * 60 * 24 * 90; // 90-day TTL — well beyond the 30-day cycle

// In-memory fallback when Redis is unavailable
let inMemoryLastRun: number | null = null;

/**
 * Read the epoch-ms timestamp of the last successful warmup from Redis.
 * Falls back to module-level variable if Redis is unavailable.
 */
async function getLastWarmupTime(redis: Redis | null): Promise<number | null> {
	if (redis?.status === 'ready') {
		try {
			const raw = await redis.get(LAST_RUN_KEY);
			if (raw) return Number(raw);
		} catch {
			// Fall through to in-memory
		}
	}
	return inMemoryLastRun;
}

/**
 * Persist the current time as the last successful warmup timestamp.
 * Writes to both Redis (if available) and the in-memory fallback.
 */
export async function setLastWarmupTime(redis: Redis | null): Promise<void> {
	const now = Date.now();
	inMemoryLastRun = now;

	if (redis?.status === 'ready') {
		try {
			await redis.set(LAST_RUN_KEY, now.toString(), 'EX', LAST_RUN_REDIS_TTL);
		} catch {
			// Non-critical — in-memory value is still set
		}
	}
}

export interface ScheduleHandle {
	/** Clear the recurring check interval. */
	stop: () => void;
}

/**
 * Schedule a warmup function to run once per `targetIntervalMs`.
 *
 * Instead of passing the raw interval to `setInterval` (which would
 * overflow for values > ~24.85 days), we tick every 24 hours and
 * compare elapsed time against `targetIntervalMs`.
 *
 * @param warmupFn       - Async function to execute when the interval elapses.
 * @param redis          - Redis client (nullable — graceful fallback to memory).
 * @param targetIntervalMs - Desired interval between runs (e.g. 30 days).
 * @param log            - Pino logger instance.
 * @returns A handle with a `stop()` method for graceful shutdown.
 */
export function scheduleRecurringWarmup(
	warmupFn: () => Promise<void>,
	redis: Redis | null,
	targetIntervalMs: number,
	log: Logger,
): ScheduleHandle {
	if (targetIntervalMs <= 0) {
		throw new RangeError('targetIntervalMs must be positive');
	}

	// Guard against direct misuse elsewhere — clip to safe ceiling
	const safeCheckInterval = Math.min(CHECK_INTERVAL_MS, MAX_SAFE_TIMER_MS);

	let running = false;

	async function tick(): Promise<void> {
		if (running) return; // Prevent overlapping runs from slow warmups

		try {
			const lastRun = await getLastWarmupTime(redis);
			const elapsed = lastRun === null ? Infinity : Date.now() - lastRun;

			if (elapsed < targetIntervalMs) {
				log.debug(
					{ nextCheckIn: '24h', remainingDays: ((targetIntervalMs - elapsed) / (24 * 60 * 60 * 1000)).toFixed(1) },
					'Warmup interval not yet reached, will check again later',
				);
				return;
			}

			running = true;
			log.info('Warmup interval reached, triggering warmup');
			await warmupFn();
		} catch (err) {
			log.error({ err }, 'Scheduled warmup tick failed');
		} finally {
			running = false;
		}
	}

	// First tick fires immediately (caller already waited the initial delay)
	tick();

	const handle = setInterval(tick, safeCheckInterval);

	// Prevent the interval from keeping the process alive during shutdown
	if (handle.unref) handle.unref();

	return {
		stop: () => clearInterval(handle),
	};
}
