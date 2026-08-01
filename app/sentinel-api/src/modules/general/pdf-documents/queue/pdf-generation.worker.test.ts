import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    workerCtorMock,
    workerCloseMock,
    workerOnMock,
    processJobMock,
    createRedisConnectionMock,
    closeRedisConnectionMock,
} = vi.hoisted(() => ({
    workerCtorMock: vi.fn(),
    workerCloseMock: vi.fn().mockResolvedValue(undefined),
    workerOnMock: vi.fn(),
    processJobMock: vi.fn().mockResolvedValue(undefined),
    createRedisConnectionMock: vi.fn().mockReturnValue({ connection: 'worker-redis' }),
    closeRedisConnectionMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bullmq', () => ({
    Worker: class MockWorker {
        public processor: any;

        constructor(name: string, processor: any, options: any) {
            this.processor = processor;
            workerCtorMock(name, processor, options);
        }

        on = workerOnMock;
        close = workerCloseMock;
    },
}));

vi.mock('../../../../lib/redis/redis.service', () => ({
    createRedisConnection: createRedisConnectionMock,
    closeRedisConnection: closeRedisConnectionMock,
}));

vi.mock('./pdf-generation-job-processor.service', () => ({
    PdfGenerationJobProcessor: {
        processJob: processJobMock,
    },
}));

describe('pdf-generation.worker', () => {
    beforeEach(async () => {
        process.env.PDF_GENERATION_MODE = 'redis';
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('starts the worker once with the expected queue settings', async () => {
        const { startPdfGenerationWorker, stopPdfGenerationWorker } =
            await import('./pdf-generation.worker');

        const worker = await startPdfGenerationWorker();
        const sameWorker = await startPdfGenerationWorker();

        expect(worker).toBe(sameWorker);
        expect(createRedisConnectionMock).toHaveBeenCalledWith('worker');
        expect(workerCtorMock).toHaveBeenCalledTimes(1);
        expect(workerCtorMock).toHaveBeenCalledWith(
            'pdf-generation',
            expect.any(Function),
            expect.objectContaining({
                connection: { connection: 'worker-redis' },
                concurrency: 2,
                lockDuration: 60000,
                drainDelay: 120,
                stalledInterval: 300000,
            }),
        );
        expect(workerOnMock).toHaveBeenCalledWith('failed', expect.any(Function));

        await stopPdfGenerationWorker();
    });

    it('invokes the job processor with export id and document kind', async () => {
        const { startPdfGenerationWorker, stopPdfGenerationWorker } =
            await import('./pdf-generation.worker');

        await startPdfGenerationWorker();
        const processor = workerCtorMock.mock.calls[0][1];

        await processor({
            id: 'job-1',
            data: {
                exportId: 'export-123',
                documentKind: 'ANALYTICS_OVERALL',
            },
        });

        expect(processJobMock).toHaveBeenCalledWith(
            expect.anything(),
            'export-123',
            'ANALYTICS_OVERALL',
        );

        await stopPdfGenerationWorker();
    });

    it('invokes the job processor with export id and EXAM_RESULTS_REPORT kind', async () => {
        const { startPdfGenerationWorker, stopPdfGenerationWorker } =
            await import('./pdf-generation.worker');

        await startPdfGenerationWorker();
        const processor = workerCtorMock.mock.calls[0][1];

        await processor({
            id: 'job-1',
            data: {
                exportId: 'export-789',
                documentKind: 'EXAM_RESULTS_REPORT',
            },
        });

        expect(processJobMock).toHaveBeenCalledWith(
            expect.anything(),
            'export-789',
            'EXAM_RESULTS_REPORT',
        );

        await stopPdfGenerationWorker();
    });

    it('rethrows processor failures so BullMQ can mark the job failed', async () => {
        processJobMock.mockRejectedValueOnce(new Error('render failed'));

        const { startPdfGenerationWorker, stopPdfGenerationWorker } =
            await import('./pdf-generation.worker');

        await startPdfGenerationWorker();
        const processor = workerCtorMock.mock.calls[0][1];

        await expect(
            processor({
                id: 'job-2',
                data: {
                    exportId: 'export-456',
                    documentKind: 'EXAM_ANSWER_KEY',
                },
            }),
        ).rejects.toThrow('render failed');

        await stopPdfGenerationWorker();
    });

    it('does not start the worker and returns null when mode is sync', async () => {
        process.env.PDF_GENERATION_MODE = 'sync';

        const { startPdfGenerationWorker, stopPdfGenerationWorker } =
            await import('./pdf-generation.worker');

        const worker = await startPdfGenerationWorker();

        expect(worker).toBeNull();
        expect(createRedisConnectionMock).not.toHaveBeenCalled();
        expect(workerCtorMock).not.toHaveBeenCalled();

        await stopPdfGenerationWorker();
    });

    it('closes the worker and redis connection on shutdown', async () => {
        const { startPdfGenerationWorker, stopPdfGenerationWorker } =
            await import('./pdf-generation.worker');

        await startPdfGenerationWorker();
        await stopPdfGenerationWorker();

        expect(workerCloseMock).toHaveBeenCalledTimes(1);
        expect(closeRedisConnectionMock).toHaveBeenCalledWith({ connection: 'worker-redis' });
    });
});
