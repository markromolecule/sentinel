export const PRODUCTION_DOMAIN = 'sentinelph.tech';
export const DEFAULT_DEV_PORT = 3001;
export const DEFAULT_PROD_PORT = 8080;

export const EXPECTED_PRODUCTION_URLS = {
    NEXT_PUBLIC_APP_URL: `https://app.${PRODUCTION_DOMAIN}`,
    NEXT_PUBLIC_WEB_URL: `https://app.${PRODUCTION_DOMAIN}`,
    FRONTEND_URL: `https://app.${PRODUCTION_DOMAIN}`,
    NEXT_PUBLIC_CORE_URL: `https://core.${PRODUCTION_DOMAIN}`,
    CORE_URL: `https://core.${PRODUCTION_DOMAIN}`,
    NEXT_PUBLIC_SUPPORT_URL: `https://support.${PRODUCTION_DOMAIN}`,
    SUPPORT_URL: `https://support.${PRODUCTION_DOMAIN}`,
} as const;

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.NODE_ENV === 'production';
}

/**
 * Deterministically resolves the listening port for the API server.
 * - If process.env.PORT is a valid integer (1-65535), it is used.
 * - In production (NODE_ENV=production), if PORT is omitted or invalid, it defaults to 8080 (matching Railway Public Networking).
 * - In development/test, if PORT is omitted or invalid, it defaults to 3001.
 */
export function resolveServerPort(env: NodeJS.ProcessEnv = process.env): number {
    const rawPort = env.PORT?.trim();

    if (rawPort) {
        const parsed = Number(rawPort);
        if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
            return parsed;
        }
        console.warn(
            `[startup] PORT was set to invalid value "${rawPort}". Falling back to default port.`,
        );
    }

    if (isProduction(env)) {
        return DEFAULT_PROD_PORT;
    }

    return DEFAULT_DEV_PORT;
}

/**
 * Resolves the bind address for the API server.
 * Defaults to "0.0.0.0" for containerized deployments.
 */
export function resolveBindHost(env: NodeJS.ProcessEnv = process.env): string {
    const rawHost = (env.BIND_HOST || env.HOST || '').trim();
    if (!rawHost) return '0.0.0.0';

    // Accept valid IPv4, IPv6 or localhost bind addresses
    if (/^((\d{1,3}\.){3}\d{1,3}|\[?::[\da-f:]*\]?|localhost)$/i.test(rawHost)) {
        return rawHost;
    }

    console.warn(
        `[startup] HOST was set to "${rawHost}", which is not a valid network bind IP. Falling back to "0.0.0.0".`,
    );
    return '0.0.0.0';
}

/**
 * Resolves the canonical base URL for the API service.
 */
export function resolveBaseUrl(port: number, env: NodeJS.ProcessEnv = process.env): string {
    if (isProduction(env)) {
        return `https://api.${PRODUCTION_DOMAIN}`;
    }
    return `http://localhost:${port}`;
}

export function normalizeUrl(value?: string | null): string | null {
    if (!value) return null;

    try {
        const url = new URL(value);
        return url.toString().replace(/\/+$/, '');
    } catch {
        return null;
    }
}

export function validateProductionInviteUrls(env: NodeJS.ProcessEnv = process.env): void {
    if (!isProduction(env)) {
        return;
    }

    for (const [envName, expectedUrl] of Object.entries(EXPECTED_PRODUCTION_URLS)) {
        const currentValue = env[envName];

        if (!currentValue) {
            continue;
        }

        const normalizedCurrentValue = normalizeUrl(currentValue);

        if (!normalizedCurrentValue) {
            console.warn(
                `[startup] ${envName} is not a valid absolute URL: "${currentValue}". Expected ${expectedUrl}.`,
            );
            continue;
        }

        if (normalizedCurrentValue !== expectedUrl) {
            console.warn(
                `[startup] ${envName} is set to ${normalizedCurrentValue}. Expected ${expectedUrl} for production invite redirects.`,
            );
        }
    }
}
