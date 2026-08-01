import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfCleanupService } from './pdf-cleanup.service';

const {
    deletePdfMock,
    createLogMock,
    executeTransactionMock,
    analyticsRowsRef,
    examReportRowsRef,
    analyticsUpdateExecuteMock,
    examReportUpdateExecuteMock,
} = vi.hoisted(() => ({
    deletePdfMock: vi
        .fn<(...args: [string, string]) => Promise<void>>()
        .mockResolvedValue(undefined),
    createLogMock: vi
        .fn<(dbClient: unknown, payload: unknown) => Promise<void>>()
        .mockResolvedValue(undefined),
    executeTransactionMock: vi.fn(),
    analyticsRowsRef: { current: [] as Array<Record<string, unknown>> },
    examReportRowsRef: { current: [] as Array<Record<string, unknown>> },
    analyticsUpdateExecuteMock: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    examReportUpdateExecuteMock: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock('../storage/pdf-storage.service', () => ({
    PdfStorageService: {
        deletePdf: deletePdfMock,
    },
}));

vi.mock('../../logs/logs.service', () => ({
    LogsService: {
        createLog: createLogMock,
    },
}));

vi.mock('@sentinel/db', () => ({
    executeTransaction: executeTransactionMock,
}));

function createWhereChain(rows: Array<Record<string, unknown>>) {
    return {
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(rows),
    };
}

function createDbClient() {
    return {
        selectFrom: vi.fn((tableName: string) => {
            if (tableName === 'analytics_reports') {
                return {
                    select: vi.fn(() => createWhereChain(analyticsRowsRef.current)),
                };
            }

            if (tableName === 'exam_report_exports') {
                return {
                    select: vi.fn(() => createWhereChain(examReportRowsRef.current)),
                };
            }

            throw new Error(`Unexpected table ${tableName}`);
        }),
    } as const;
}

describe('PdfCleanupService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        analyticsRowsRef.current = [];
        examReportRowsRef.current = [];

        executeTransactionMock.mockImplementation(
            async (callback: (trx: unknown) => Promise<unknown>) =>
                callback({
                    updateTable: (tableName: string) => ({
                        set: () => ({
                            where: () => ({
                                execute:
                                    tableName === 'analytics_reports'
                                        ? analyticsUpdateExecuteMock
                                        : examReportUpdateExecuteMock,
                            }),
                        }),
                    }),
                }),
        );
    });

    it('purges expired READY analytics exports and marks them EXPIRED', async () => {
        analyticsRowsRef.current = [
            {
                id: 'report-1',
                institutionId: 'inst-1',
                storageBucket: 'sentinel-pdf-artifacts',
                storagePath: 'analytics/inst-1/report-1.pdf',
                expiresAt: new Date('2026-07-31T00:00:00.000Z'),
            },
        ];
        const dbClient = createDbClient();

        const count = await PdfCleanupService.purgeExpiredAnalytics(dbClient as never);

        expect(count).toBe(1);
        expect(deletePdfMock).toHaveBeenCalledWith(
            'sentinel-pdf-artifacts',
            'analytics/inst-1/report-1.pdf',
        );
        expect(analyticsUpdateExecuteMock).toHaveBeenCalledTimes(1);
        expect(createLogMock).toHaveBeenCalledWith(
            dbClient,
            expect.objectContaining({
                action: 'PDF_EXPORT_PURGED',
                activeInstitutionId: 'inst-1',
            }),
        );
    });

    it('purges expired READY exam report exports and preserves non-storage metadata', async () => {
        examReportRowsRef.current = [
            {
                id: 'export-1',
                institutionId: 'inst-1',
                storageBucket: 'sentinel-pdf-artifacts',
                storagePath: 'exam-reports/inst-1/exam-1/export-1.pdf',
                expiresAt: new Date('2026-07-31T00:00:00.000Z'),
                templateSnapshot: { keep: true },
            },
        ];

        const dbClient = createDbClient();
        const count = await PdfCleanupService.purgeExpiredExamReports(dbClient as never);

        expect(count).toBe(1);
        expect(deletePdfMock).toHaveBeenCalledWith(
            'sentinel-pdf-artifacts',
            'exam-reports/inst-1/exam-1/export-1.pdf',
        );
        expect(examReportUpdateExecuteMock).toHaveBeenCalledTimes(1);
        expect(createLogMock).toHaveBeenCalledWith(
            dbClient,
            expect.objectContaining({
                action: 'EXAM_REPORT_EXPORT_PURGED',
                activeInstitutionId: 'inst-1',
            }),
        );
    });

    it('continues expiring an exam report when the storage object is already missing', async () => {
        examReportRowsRef.current = [
            {
                id: 'export-2',
                institutionId: null,
                storageBucket: 'sentinel-pdf-artifacts',
                storagePath: 'exam-reports/inst-1/exam-1/export-2.pdf',
                expiresAt: new Date('2026-07-31T00:00:00.000Z'),
            },
        ];
        deletePdfMock.mockRejectedValueOnce(new Error('Object not found'));

        const count = await PdfCleanupService.purgeExpiredExamReports(createDbClient() as never);

        expect(count).toBe(1);
        expect(examReportUpdateExecuteMock).toHaveBeenCalledTimes(1);
    });

    it('does not expire an exam report when storage deletion fails unexpectedly', async () => {
        examReportRowsRef.current = [
            {
                id: 'export-3',
                institutionId: 'inst-1',
                storageBucket: 'sentinel-pdf-artifacts',
                storagePath: 'exam-reports/inst-1/exam-1/export-3.pdf',
                expiresAt: new Date('2026-07-31T00:00:00.000Z'),
            },
        ];
        deletePdfMock.mockRejectedValueOnce(new Error('storage unavailable'));

        const count = await PdfCleanupService.purgeExpiredExamReports(createDbClient() as never);

        expect(count).toBe(0);
        expect(examReportUpdateExecuteMock).not.toHaveBeenCalled();
    });

    it('never deletes a storage path outside the exam-reports prefix', async () => {
        examReportRowsRef.current = [
            {
                id: 'export-4',
                institutionId: 'inst-1',
                storageBucket: 'sentinel-pdf-artifacts',
                storagePath: 'analytics/inst-1/report-4.pdf',
                expiresAt: new Date('2026-07-31T00:00:00.000Z'),
            },
        ];

        const count = await PdfCleanupService.purgeExpiredExamReports(createDbClient() as never);

        expect(count).toBe(0);
        expect(deletePdfMock).not.toHaveBeenCalled();
        expect(examReportUpdateExecuteMock).not.toHaveBeenCalled();
    });

    it('excludes answer-key rows from the exam report cleanup path', async () => {
        examReportRowsRef.current = [];

        const count = await PdfCleanupService.purgeExpiredExamReports(createDbClient() as never);

        expect(count).toBe(0);
        expect(deletePdfMock).not.toHaveBeenCalled();
        expect(examReportUpdateExecuteMock).not.toHaveBeenCalled();
    });

    it('purges analytics and exam reports independently in the orchestrator', async () => {
        const analyticsSpy = vi
            .spyOn(PdfCleanupService, 'purgeExpiredAnalytics')
            .mockResolvedValueOnce(2);
        const examReportsSpy = vi
            .spyOn(PdfCleanupService, 'purgeExpiredExamReports')
            .mockRejectedValueOnce(new Error('exam cleanup failed'));

        const summary = await PdfCleanupService.purgeExpiredPdfArtifacts(createDbClient() as never);

        expect(summary).toEqual({
            analytics: {
                purgedCount: 2,
                error: null,
            },
            examReports: {
                purgedCount: 0,
                error: 'exam cleanup failed',
            },
        });
        expect(analyticsSpy).toHaveBeenCalledTimes(1);
        expect(examReportsSpy).toHaveBeenCalledTimes(1);
    });
});
