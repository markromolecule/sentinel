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

import {
    isProduction,
    resolveBaseUrl,
    resolveBindHost,
    resolveServerPort,
    validateProductionInviteUrls,
} from './server.config';

const port = resolveServerPort();
const hostname = resolveBindHost();

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

const isProd = isProduction();
const baseUrl = resolveBaseUrl(port);
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());

console.log(
    `[startup] Server is running on ${baseUrl} (listening on ${hostname}:${port}) [mode: ${process.env.NODE_ENV || 'development'}]`,
);
console.log(
    `[startup] Gemini AI integration: ${hasGeminiKey ? 'Configured (API key detected)' : 'Warning: GEMINI_API_KEY is not set'}`,
);

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
