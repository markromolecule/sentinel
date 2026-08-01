import { Queue } from 'bullmq';
import { createRedisConnection, closeRedisConnection } from '../../../../lib/redis/redis.service';
import {
    getPdfQueueName,
    getPdfJobOptions,
    getPdfGenerationMode,
} from './pdf-generation-queue.config';
import { PdfGenerationJobProcessor } from './pdf-generation-job-processor.service';
import { dbClient, transactionStorage } from '@sentinel/db';
import { getPdfGenerationLogErrorMessage } from './pdf-generation-log-redaction';

export class PdfGenerationQueueService {
    private queue: Queue | null = null;
    private queueConnection: any = null;

    /**
     * Lazily creates and returns the BullMQ Queue instance.
     */
    async getQueue(): Promise<Queue> {
        if (!this.queue) {
            this.queueConnection = createRedisConnection('producer');
            this.queue = new Queue(getPdfQueueName(), {
                connection: this.queueConnection,
                defaultJobOptions: getPdfJobOptions(),
            });
        }
        return this.queue;
    }

    /**
     * Queues a PDF generation background job. Uses the export UUID as the jobId
     * to prevent duplicate concurrent generation requests for the same artifact.
     *
     * @param exportId unique PDF export document ID
     * @param documentKind type of document being generated
     */
    async submitPdfJob(
        exportId: string,
        documentKind: 'ANALYTICS_OVERALL' | 'EXAM_ANSWER_KEY' | 'EXAM_RESULTS_REPORT',
    ): Promise<void> {
        const mode = getPdfGenerationMode();

        if (mode === 'sync') {
            console.log(
                `[PdfGenerationQueueService] PDF generation mode is "sync". Executing job ${exportId} directly in the API process...`,
            );

            const activeTrx = transactionStorage.getStore();
            const runJob = () =>
                PdfGenerationJobProcessor.processJob(dbClient, exportId, documentKind)
                    .then(() => {
                        console.log(
                            `[PdfGenerationQueueService] Direct job ${exportId} completed successfully.`,
                        );
                    })
                    .catch((err) => {
                        console.error(
                            `[PdfGenerationQueueService] Direct job ${exportId} failed:`,
                            getPdfGenerationLogErrorMessage(documentKind, err),
                        );
                    });

            if (activeTrx) {
                void transactionStorage.run(activeTrx, runJob);
            } else {
                void runJob();
            }

            return;
        }

        const queue = await this.getQueue();

        await queue.add(
            'generate-pdf',
            { exportId, documentKind },
            {
                jobId: exportId,
            },
        );
    }

    /**
     * Closes the queue connection gracefully.
     */
    async close(): Promise<void> {
        if (this.queue) {
            await this.queue.close();
            this.queue = null;
        }
        if (this.queueConnection) {
            await closeRedisConnection(this.queueConnection);
            this.queueConnection = null;
        }
    }
}

export const pdfGenerationQueueService = new PdfGenerationQueueService();
