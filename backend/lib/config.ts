/**
 * Centralized configuration module with Zod validation.
 * Validates all environment variables on startup and fails fast if required vars are missing.
 */

import { z } from 'zod';

const configSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().int().positive().default(3000),
	REDIS_URL: z.string().url().optional(),
	CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN must be set'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
	const result = configSchema.safeParse({
		NODE_ENV: process.env.NODE_ENV,
		PORT: process.env.PORT,
		REDIS_URL: process.env.REDIS_URL || undefined,
		CORS_ORIGIN: process.env.CORS_ORIGIN,
	});

	if (!result.success) {
		console.error('❌ Invalid environment configuration:');
		for (const issue of result.error.issues) {
			console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
		}
		process.exit(1);
	}

	return result.data;
}

export const config = loadConfig();
