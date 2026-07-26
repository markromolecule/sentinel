import IORedis from 'ioredis';

export type RedisConnectionRole = 'producer' | 'worker';

const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;

const getRedisUrl = (): string | undefined => {
    return process.env.REDIS_URL?.trim() || undefined;
};

export const hasRedisConfigured = (): boolean => {
    return Boolean(getRedisUrl());
};

export const assertRedisConfigured = (): string => {
    const redisUrl = getRedisUrl();

    if (!redisUrl) {
        throw new Error('REDIS_URL is required when TELEMETRY_INGESTION_MODE is set to redis.');
    }

    return redisUrl;
};

export const createRedisConnection = (role: RedisConnectionRole = 'producer'): IORedis => {
    const redisUrl = assertRedisConfigured();

    return new IORedis(redisUrl, {
        connectTimeout: DEFAULT_CONNECT_TIMEOUT_MS,
        enableOfflineQueue: true, // Allow queuing commands while connecting
        lazyConnect: false, // Connect immediately at startup
        maxRetriesPerRequest: null,
    });
};

export const closeRedisConnection = async (
    connection: Pick<IORedis, 'quit' | 'disconnect'> | null | undefined,
): Promise<void> => {
    if (!connection) {
        return;
    }

    try {
        await connection.quit();
    } catch {
        connection.disconnect();
    }
};

/**
 * Validates that the connected Redis instance has recommended settings for BullMQ.
 * Specifically checks that maxmemory-policy is set to 'noeviction'.
 */
export const validateRedisConfig = async (connection: IORedis): Promise<void> => {
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`[Redis] Validating configuration (Production: ${isProduction})...`);

    try {
        // BullMQ requires noeviction to prevent job loss
        const configResult = await connection.config('GET', 'maxmemory-policy');
        console.log(`[Redis] Config GET result: ${JSON.stringify(configResult)}`);

        if (Array.isArray(configResult) && configResult.length >= 2) {
            const policy = configResult[1];

            if (policy !== 'noeviction') {
                console.log(`[Redis] Policy is "${policy}", attempting auto-fix...`);
                // In non-production, attempt to auto-fix the policy
                if (!isProduction) {
                    try {
                        await connection.config('SET', 'maxmemory-policy', 'noeviction');
                        console.log(
                            '\x1b[32m%s\x1b[0m',
                            '[Redis] Successfully set maxmemory-policy to "noeviction".',
                        );
                        return; // Successfully fixed
                    } catch (fixError: any) {
                        console.error(`[Redis] Auto-fix failed: ${fixError.message}`);
                    }
                }

                console.warn(
                    '\x1b[33m%s\x1b[0m',
                    '----------------------------------------------------------------',
                );
                console.warn('\x1b[33m%s\x1b[0m', '⚠️  REDIS CONFIGURATION WARNING');
                console.warn('\x1b[33m%s\x1b[0m', `Current maxmemory-policy is "${policy}".`);
                console.warn(
                    '\x1b[33m%s\x1b[0m',
                    'BullMQ requires "noeviction" to prevent accidental job loss.',
                );
                console.warn(
                    '\x1b[33m%s\x1b[0m',
                    'Fix this by running the following command in your terminal:',
                );
                console.warn(
                    '\x1b[33m%s\x1b[0m',
                    '  redis-cli CONFIG SET maxmemory-policy noeviction',
                );
                console.warn(
                    '\x1b[33m%s\x1b[0m',
                    '----------------------------------------------------------------',
                );
            }
        }
    } catch (error) {
        // Some managed Redis instances (like Upstash) might disable CONFIG command.
        // We log it as a debug/info message instead of a warning since we can't verify.
        if (!isProduction) {
            console.info(
                '[Redis] Could not verify maxmemory-policy (CONFIG command might be disabled).',
            );
        }
    }
};
