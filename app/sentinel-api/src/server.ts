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

const port = 3001;

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
});

const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = isProduction ? 'https://api.sentinelph.tech' : `http://localhost:${port}`;

console.log(`Server is running on ${baseUrl}`);

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
