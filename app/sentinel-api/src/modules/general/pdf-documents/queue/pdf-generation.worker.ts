import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { Worker, Job } from 'bullmq';
import { dbClient } from '@sentinel/db';
import { createRedisConnection, closeRedisConnection } from '../../../../lib/redis/redis.service';
import {
    getPdfQueueName,
    getPdfGenerationMode,
    getPdfWorkerConcurrency,
    getPdfWorkerDrainDelaySeconds,
    getPdfWorkerStalledIntervalMs,
} from './pdf-generation-queue.config';
import { PdfGenerationJobProcessor } from './pdf-generation-job-processor.service';

let worker: Worker | null = null;
let workerConnection: any = null;

/**
 * Initializes and starts the background BullMQ Worker for PDF generation.
 * Handles jobs concurrently and configures long-poll drain delay and stalled intervals.
 */
export async function startPdfGenerationWorker(): Promise<Worker | null> {
    if (worker) return worker;

    if (getPdfGenerationMode() !== 'redis') {
        console.log(
            `[PDFWorker] PDF generation mode is set to "${getPdfGenerationMode()}". PDF worker is inactive.`,
        );
        return null;
    }

    const queueName = getPdfQueueName();
    const concurrency = getPdfWorkerConcurrency();
    const drainDelay = getPdfWorkerDrainDelaySeconds();
    const stalledInterval = getPdfWorkerStalledIntervalMs();
    const workerInstanceId = randomUUID();
    const host = hostname();
    const pid = process.pid;

    workerConnection = createRedisConnection('worker');

    worker = new Worker(
        queueName,
        async (
            job: Job<{
                exportId: string;
                documentKind: 'ANALYTICS_OVERALL' | 'EXAM_ANSWER_KEY' | 'EXAM_RESULTS_REPORT';
            }>,
        ) => {
            const { exportId, documentKind } = job.data;
            console.log(`[PDFWorker] Processing job ${job.id} for export ${exportId}`);

            try {
                await PdfGenerationJobProcessor.processJob(dbClient, exportId, documentKind);
                console.log(`[PDFWorker] Successfully completed export ${exportId}`);
            } catch (err: any) {
                console.error(`[PDFWorker] Failed processing export ${exportId}:`, err.message);
                throw err;
            }
        },
        {
            connection: workerConnection,
            concurrency,
            lockDuration: 60000, // 60 seconds lock duration
            drainDelay,
            stalledInterval,
        },
    );

    worker.on('failed', (job, err) => {
        console.error(`[PDFWorker] Job ${job?.id} failed with error:`, err.message);
    });

    console.log(
        `[PDFWorker] Background PDF Generation Worker started successfully. ` +
            `[id=${workerInstanceId}, host=${host}, pid=${pid}, queue=${queueName}, concurrency=${concurrency}, drainDelay=${drainDelay}s, stalledInterval=${stalledInterval}ms]`,
    );
    return worker;
}

/**
 * Shuts down the worker and its Redis connections.
 */
export async function stopPdfGenerationWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
    }
    if (workerConnection) {
        await closeRedisConnection(workerConnection);
        workerConnection = null;
    }
    console.log('[PDFWorker] Background PDF Generation Worker stopped.');
}
