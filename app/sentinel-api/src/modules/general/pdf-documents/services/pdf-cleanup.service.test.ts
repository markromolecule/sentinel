import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfCleanupService } from './pdf-cleanup.service';

const { deletePdfMock, createLogMock, executeTransactionMock } = vi.hoisted(() => ({
    deletePdfMock: vi.fn().mockResolvedValue(undefined),
    createLogMock: vi.fn().mockResolvedValue(undefined),
    executeTransactionMock: vi.fn(async (callback) => {
        return callback({
            updateTable: () => ({
                set: () => ({
                    where: () => ({
                        execute: vi.fn().mockResolvedValue(undefined),
                    }),
                }),
            }),
        });
    }),
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

describe('PdfCleanupService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('purges expired READY analytics exports and marks them EXPIRED', async () => {
        const expiredRow = {
            report_id: 'report-1',
            institution_id: 'inst-1',
            status: 'READY',
            storage_bucket: 'sentinel-pdf-assets',
            storage_path: 'analytics/inst-1/report-1.pdf',
            expires_at: new Date('2026-07-01T00:00:00.000Z'),
        };

        const updateExecuteMock = vi.fn().mockResolvedValue(undefined);
        executeTransactionMock.mockImplementationOnce(async (callback) => {
            return callback({
                updateTable: () => ({
                    set: () => ({
                        where: () => ({
                            execute: updateExecuteMock,
                        }),
                    }),
                }),
            });
        });

        const dbClient = {
            selectFrom: vi.fn().mockReturnValue({
                selectAll: () => ({
                    where: () => ({
                        where: () => ({
                            execute: async () => [expiredRow],
                        }),
                    }),
                }),
            }),
        } as any;

        const count = await PdfCleanupService.purgeExpiredAnalytics(dbClient);

        expect(count).toBe(1);
        expect(deletePdfMock).toHaveBeenCalledWith(
            'sentinel-pdf-assets',
            'analytics/inst-1/report-1.pdf',
        );
        expect(updateExecuteMock).toHaveBeenCalledTimes(1);
        expect(createLogMock).toHaveBeenCalledWith(
            dbClient,
            expect.objectContaining({
                action: 'PDF_EXPORT_PURGED',
                activeInstitutionId: 'inst-1',
            }),
        );
    });

    it('continues expiring the record when storage deletion fails', async () => {
        deletePdfMock.mockRejectedValueOnce(new Error('storage unavailable'));

        const expiredRow = {
            report_id: 'report-2',
            institution_id: null,
            status: 'READY',
            storage_bucket: 'sentinel-pdf-assets',
            storage_path: 'analytics/global/report-2.pdf',
            expires_at: new Date('2026-07-01T00:00:00.000Z'),
        };

        const updateExecuteMock = vi.fn().mockResolvedValue(undefined);
        executeTransactionMock.mockImplementationOnce(async (callback) => {
            return callback({
                updateTable: () => ({
                    set: () => ({
                        where: () => ({
                            execute: updateExecuteMock,
                        }),
                    }),
                }),
            });
        });

        const dbClient = {
            selectFrom: vi.fn().mockReturnValue({
                selectAll: () => ({
                    where: () => ({
                        where: () => ({
                            execute: async () => [expiredRow],
                        }),
                    }),
                }),
            }),
        } as any;

        const count = await PdfCleanupService.purgeExpiredAnalytics(dbClient);

        expect(count).toBe(1);
        expect(updateExecuteMock).toHaveBeenCalledTimes(1);
    });
});
