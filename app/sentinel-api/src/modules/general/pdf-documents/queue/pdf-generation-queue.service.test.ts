import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfGenerationQueueService } from './pdf-generation-queue.service';

const {
    addMock,
    closeMock,
    createRedisConnectionMock,
    closeRedisConnectionMock,
    queueCtorMock,
    processJobMock,
} = vi.hoisted(() => ({
    addMock: vi.fn().mockResolvedValue(undefined),
    closeMock: vi.fn().mockResolvedValue(undefined),
    createRedisConnectionMock: vi.fn().mockReturnValue({ connection: 'redis' }),
    closeRedisConnectionMock: vi.fn().mockResolvedValue(undefined),
    queueCtorMock: vi.fn(),
    processJobMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bullmq', () => ({
    Queue: class MockQueue {
        constructor(name: string, options: any) {
            queueCtorMock(name, options);
        }

        add = addMock;
        close = closeMock;
    },
}));

vi.mock('../../../../lib/redis/redis.service', () => ({
    createRedisConnection: createRedisConnectionMock,
    closeRedisConnection: closeRedisConnectionMock,
}));

vi.mock('@sentinel/db', () => ({
    dbClient: { connection: 'mock-db' },
    transactionStorage: {
        getStore: vi.fn(),
        run: vi.fn((ctx, callback) => callback()),
    },
}));

vi.mock('./pdf-generation-job-processor.service', () => ({
    PdfGenerationJobProcessor: {
        processJob: processJobMock,
    },
}));

describe('PdfGenerationQueueService', () => {
    let service: PdfGenerationQueueService;

    beforeEach(() => {
        process.env.PDF_GENERATION_MODE = 'redis';
        vi.clearAllMocks();
        service = new PdfGenerationQueueService();
    });

    it('creates the queue lazily and reuses it', async () => {
        const first = await service.getQueue();
        const second = await service.getQueue();

        expect(first).toBe(second);
        expect(createRedisConnectionMock).toHaveBeenCalledTimes(1);
        expect(queueCtorMock).toHaveBeenCalledTimes(1);
        expect(queueCtorMock).toHaveBeenCalledWith(
            'pdf-generation',
            expect.objectContaining({
                connection: { connection: 'redis' },
                defaultJobOptions: expect.objectContaining({
                    attempts: 3,
                }),
            }),
        );
    });

    it('submits jobs using the export id as jobId', async () => {
        await service.submitPdfJob('export-123', 'ANALYTICS_OVERALL');

        expect(addMock).toHaveBeenCalledWith(
            'generate-pdf',
            { exportId: 'export-123', documentKind: 'ANALYTICS_OVERALL' },
            { jobId: 'export-123' },
        );
    });

    it('submits jobs synchronously in-process when mode is sync', async () => {
        process.env.PDF_GENERATION_MODE = 'sync';

        await service.submitPdfJob('export-789', 'EXAM_ANSWER_KEY');

        // Sleep briefly to let the asynchronous background promise fire
        await new Promise((resolve) => setTimeout(resolve, 5));

        expect(addMock).not.toHaveBeenCalled();
        expect(processJobMock).toHaveBeenCalledWith(
            expect.anything(),
            'export-789',
            'EXAM_ANSWER_KEY',
        );
    });

    it('closes the queue and redis connection gracefully', async () => {
        await service.getQueue();
        await service.close();

        expect(closeMock).toHaveBeenCalledTimes(1);
        expect(closeRedisConnectionMock).toHaveBeenCalledWith({ connection: 'redis' });
    });
});
