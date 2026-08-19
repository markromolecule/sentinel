import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import app from './app';
import {
    startPdfGenerationWorker,
    stopPdfGenerationWorker,
} from './modules/general/pdf-documents/queue/pdf-generation.worker';
import { shouldStartEmbeddedPdfWorker } from './modules/general/pdf-documents/queue/pdf-generation-queue.config';
import {
    startLiveInspectionReconciler,
    stopLiveInspectionReconciler,
} from './modules/examination/live-inspection/services/live-inspection-reconciler.service';

const port = Number(process.env.PORT) || 3001;

function resolveBindHost(): string {
    const rawHost = (process.env.BIND_HOST || process.env.HOST || '').trim();
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

const hostname = resolveBindHost();

const PRODUCTION_DOMAIN = 'sentinelph.tech';
const EXPECTED_PRODUCTION_URLS = {
    NEXT_PUBLIC_APP_URL: `https://app.${PRODUCTION_DOMAIN}`,
    NEXT_PUBLIC_WEB_URL: `https://app.${PRODUCTION_DOMAIN}`,
    FRONTEND_URL: `https://app.${PRODUCTION_DOMAIN}`,
    NEXT_PUBLIC_CORE_URL: `https://core.${PRODUCTION_DOMAIN}`,
    CORE_URL: `https://core.${PRODUCTION_DOMAIN}`,
    NEXT_PUBLIC_SUPPORT_URL: `https://support.${PRODUCTION_DOMAIN}`,
    SUPPORT_URL: `https://support.${PRODUCTION_DOMAIN}`,
} as const;

function normalizeUrl(value?: string | null) {
    if (!value) return null;

    try {
        const url = new URL(value);
        return url.toString().replace(/\/+$/, '');
    } catch {
        return null;
    }
}

function validateProductionInviteUrls() {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    for (const [envName, expectedUrl] of Object.entries(EXPECTED_PRODUCTION_URLS)) {
        const currentValue = process.env[envName];

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

validateProductionInviteUrls();

const startEmbeddedPdfWorker = shouldStartEmbeddedPdfWorker();

if (startEmbeddedPdfWorker) {
    startPdfGenerationWorker().catch((error) => {
        console.error('[startup] Failed to start embedded PDF worker:', error);
    });
}

startLiveInspectionReconciler();

serve({
    fetch: app.fetch,
    port,
    hostname,
});

const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = isProduction ? 'https://api.sentinelph.tech' : `http://localhost:${port}`;
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());

console.log(`[startup] Server is running on ${baseUrl} (listening on ${hostname}:${port})`);
console.log(`[startup] Gemini AI integration: ${hasGeminiKey ? 'Configured (API key detected)' : 'Warning: GEMINI_API_KEY is not set'}`);

const shutdown = async () => {
    if (startEmbeddedPdfWorker) {
        await stopPdfGenerationWorker().catch((error) => {
            console.error('[shutdown] Failed to stop embedded PDF worker:', error);
        });
    }

    stopLiveInspectionReconciler();

    process.exit(0);
};

process.on('SIGTERM', () => {
    void shutdown();
});

process.on('SIGINT', () => {
    void shutdown();
});
