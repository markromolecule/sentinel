import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalyticsReportsQuery } from '../analytics/use-analytics-reports-query';
import { useGenerateAnalyticsReportMutation } from '../analytics/use-generate-analytics-report-mutation';
import { useAnalyticsReportDownloadMutation } from '../analytics/use-analytics-report-download-mutation';
import { useRetryAnalyticsReportMutation } from '../analytics/use-retry-analytics-report-mutation';
import { useAnswerKeyExportsQuery } from './use-answer-key-exports-query';
import { useCreateAnswerKeyExportMutation } from './use-create-answer-key-export-mutation';
import { useAnswerKeyExportStatusQuery } from './use-answer-key-export-status-query';
import { useAnswerKeyExportDownloadMutation } from './use-answer-key-export-download-mutation';
import { useRetryAnswerKeyExportMutation } from './use-retry-answer-key-export-mutation';
import { useCreateExamReportExportMutation } from './use-create-exam-report-export-mutation';
import { useDeleteAnswerKeyExportMutation } from './use-delete-answer-key-export-mutation';
import { useDeleteExamReportExportMutation } from './use-delete-exam-report-export-mutation';
import { useExamReportExportDownloadMutation } from './use-exam-report-export-download-mutation';
import { useExamReportExportStatusQuery } from './use-exam-report-export-status-query';
import { useExamReportExportsQuery } from './use-exam-report-exports-query';
import { usePdfTemplatesQuery } from './use-pdf-templates-query';
import { usePreviewPdfTemplateMutation } from './use-preview-pdf-template-mutation';
import { useRetryExamReportExportMutation } from './use-retry-exam-report-export-mutation';
import {
    createAnswerKeyExport,
    createExamReportExport,
    deleteAnswerKeyExport,
    deleteExamReportExport,
    generateAnalyticsReport,
    getAnalyticsReportDownload,
    getAnalyticsReports,
    getAnswerKeyExportDownload,
    getAnswerKeyExportStatus,
    getAnswerKeyExports,
    getExamReportExportDownload,
    getExamReportExports,
    getPdfTemplates,
    previewPdfTemplate,
    retryAnalyticsReport,
    retryAnswerKeyExport,
    retryExamReportExport,
} from '@sentinel/services';
import { ANALYTICS_QUERY_KEYS } from '@sentinel/shared/constants';

const { mockInvalidateQueries, mockRemoveQueries, mockUseQuery } = vi.hoisted(() => ({
    mockInvalidateQueries: vi.fn(),
    mockRemoveQueries: vi.fn(),
    mockUseQuery: vi.fn((options: any) => {
        if (options.enabled !== false && options.queryFn) {
            void options.queryFn();
        }

        return {
            ...options,
            refetchIntervalValue:
                typeof options.refetchInterval === 'function'
                    ? options.refetchInterval({
                          state: {
                              data: options.mockQueryData,
                          },
                      })
                    : options.refetchInterval,
        };
    }),
}));

vi.mock('@tanstack/react-query', () => ({
    useQuery: mockUseQuery,
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
        removeQueries: mockRemoveQueries,
    })),
    useMutation: vi.fn((options: any) => ({
        mutateAsync: async (variables: any) => {
            const data = await options.mutationFn(variables);
            await options.onSuccess?.(data, variables, null, null);
            return data;
        },
    })),
}));

vi.mock('@sentinel/services', () => ({
    getPdfTemplates: vi.fn(),
    getAnswerKeyExports: vi.fn(),
    getAnalyticsReports: vi.fn(),
    generateAnalyticsReport: vi.fn(),
    getAnalyticsReportDownload: vi.fn(),
    retryAnalyticsReport: vi.fn(),
    deleteAnswerKeyExport: vi.fn(),
    getExamReportExports: vi.fn(),
    createExamReportExport: vi.fn(),
    retryExamReportExport: vi.fn(),
    deleteExamReportExport: vi.fn(),
    getExamReportExportDownload: vi.fn(),
    getExamReportExportStatus: vi.fn(),
    previewPdfTemplate: vi.fn(),
    createAnswerKeyExport: vi.fn(),
    getAnswerKeyExportStatus: vi.fn(),
    getAnswerKeyExportDownload: vi.fn(),
    retryAnswerKeyExport: vi.fn(),
}));

vi.mock('@sentinel/shared/constants', () => ({
    ANALYTICS_QUERY_KEYS: {
        all: ['analytics'],
        reports: (
            institutionId?: string | null,
            page?: number,
            limit?: number,
            status?: string,
        ) => ['analytics', 'reports', { institutionId: institutionId ?? '', page, limit, status }],
        pdfTemplates: (institutionId?: string | null, documentKind?: string, status?: string) => [
            'analytics',
            'pdfTemplates',
            { institutionId: institutionId ?? '', documentKind, status },
        ],
        answerKeyExports: (
            institutionId?: string,
            examId?: string,
            page?: number,
            limit?: number,
        ) => [
            'analytics',
            'answerKeyExports',
            { institutionId: institutionId ?? '', examId: examId ?? '', page, limit },
        ],
        answerKeyExportStatus: (exportId?: string | null) => [
            'analytics',
            'answerKeyExportStatus',
            exportId ?? '',
        ],
        examReportExports: (
            examId?: string,
            page?: number,
            limit?: number,
            institutionId?: string,
        ) => [
            'analytics',
            'examReportExports',
            { examId: examId ?? '', page, limit, institutionId: institutionId ?? '' },
        ],
        examReportExportStatus: (examId?: string, exportId?: string | null) => [
            'analytics',
            'examReportExportStatus',
            { examId: examId ?? '', exportId: exportId ?? '' },
        ],
    },
    ANALYTICS_MUTATION_KEYS: {
        exportExamReport: () => ['analytics', 'exportExamReport'],
        retryExamReportExport: () => ['analytics', 'retryExamReportExport'],
        deleteExamReportExport: () => ['analytics', 'deleteExamReportExport'],
        exportAnswerKey: () => ['analytics', 'exportAnswerKey'],
    },
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: vi.fn(() => true),
}));

describe('pdf document hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getPdfTemplates as any).mockResolvedValue([]);
        (getAnswerKeyExports as any).mockResolvedValue({
            records: [],
            total_records: 0,
            page: 1,
            limit: 10,
        });
        (getAnalyticsReports as any).mockResolvedValue({
            records: [],
            total_records: 0,
            page: 1,
            limit: 10,
        });
        (generateAnalyticsReport as any).mockResolvedValue({ reportId: 'report-1' });
        (getAnalyticsReportDownload as any).mockResolvedValue({
            success: true,
            downloadUrl: 'https://signed.example/report-1',
        });
        (retryAnalyticsReport as any).mockResolvedValue({
            success: true,
            message: 'queued',
        });
        (deleteAnswerKeyExport as any).mockResolvedValue({
            success: true,
            message: 'deleted',
        });
        (getExamReportExports as any).mockResolvedValue({
            records: [],
            total_records: 0,
            page: 1,
            limit: 10,
        });
        (createExamReportExport as any).mockResolvedValue({
            exportId: 'export-1',
            examId: 'exam-1',
            institutionId: 'institution-1',
            templateId: null,
            status: 'PENDING',
            failureCode: null,
            failureMessage: null,
            retryCount: 0,
            createdBy: null,
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
            completedAt: null,
            expiresAt: null,
        });
        (retryExamReportExport as any).mockResolvedValue({
            success: true,
            message: 'queued',
        });
        (deleteExamReportExport as any).mockResolvedValue({
            success: true,
            message: 'deleted',
        });
        (getExamReportExportDownload as any).mockResolvedValue({
            success: true,
            downloadUrl: 'https://signed.example/exam-report-1',
        });
        (previewPdfTemplate as any).mockResolvedValue(
            new Blob(['pdf'], { type: 'application/pdf' }),
        );
    });

    it('keeps institution-specific template queries isolated in the query key', () => {
        const query = usePdfTemplatesQuery({
            payload: {
                institutionId: 'institution-1',
                documentKind: 'ANALYTICS_OVERALL',
                status: 'PUBLISHED',
            },
        }) as any;

        expect(query.queryKey).toEqual(
            ANALYTICS_QUERY_KEYS.pdfTemplates('institution-1', 'ANALYTICS_OVERALL', 'PUBLISHED'),
        );
        expect(getPdfTemplates).toHaveBeenCalledWith(
            { mockClient: true },
            {
                institutionId: 'institution-1',
                documentKind: 'ANALYTICS_OVERALL',
                status: 'PUBLISHED',
            },
        );
    });

    it('keeps answer-key list caches separated by institution and exam', () => {
        const query = useAnswerKeyExportsQuery({
            payload: {
                institutionId: 'institution-1',
                examId: 'exam-1',
                page: 2,
                limit: 20,
            },
        }) as any;

        expect(query.queryKey).toEqual(
            ANALYTICS_QUERY_KEYS.answerKeyExports('institution-1', 'exam-1', 2, 20),
        );
    });

    it('keeps exam-report lifecycle caches isolated by exam and export', () => {
        const listQuery = useExamReportExportsQuery({
            payload: {
                institutionId: 'institution-1',
                examId: 'exam-1',
                page: 2,
                limit: 20,
            },
        }) as any;
        const statusQuery = useExamReportExportStatusQuery({
            payload: {
                institutionId: 'institution-1',
                examId: 'exam-1',
                exportId: 'export-1',
                page: 2,
                limit: 20,
            },
        }) as any;

        expect(listQuery.queryKey).toEqual(
            ANALYTICS_QUERY_KEYS.examReportExports('exam-1', 2, 20, 'institution-1'),
        );
        expect(statusQuery.queryKey).toEqual(
            ANALYTICS_QUERY_KEYS.examReportExportStatus('exam-1', 'export-1'),
        );
        expect(getExamReportExports).toHaveBeenCalledWith(
            { mockClient: true },
            {
                institutionId: 'institution-1',
                examId: 'exam-1',
                page: 2,
                limit: 20,
            },
        );
    });

    it('polls analytics reports only while the current page has active jobs', () => {
        const query = useAnalyticsReportsQuery({
            payload: {
                institutionId: 'institution-1',
                page: 1,
                limit: 10,
            },
            mockQueryData: {
                records: [{ status: 'PENDING' }],
            } as any,
        } as any) as any;

        expect(query.queryKey).toEqual(
            ANALYTICS_QUERY_KEYS.reports('institution-1', 1, 10, undefined),
        );
        expect(query.refetchIntervalValue).toBe(5000);
    });

    it('polls exam-report status only while pending or generating and stops on terminal states', () => {
        const pendingQuery = useExamReportExportStatusQuery({
            payload: {
                institutionId: 'institution-1',
                examId: 'exam-1',
                exportId: 'export-1',
            },
            mockQueryData: {
                status: 'PENDING',
            } as any,
        } as any) as any;

        const readyQuery = useExamReportExportStatusQuery({
            payload: {
                institutionId: 'institution-1',
                examId: 'exam-1',
                exportId: 'export-1',
            },
            mockQueryData: {
                status: 'READY',
            } as any,
        } as any) as any;

        expect(pendingQuery.refetchIntervalValue).toBe(5000);
        expect(readyQuery.refetchIntervalValue).toBe(false);
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.examReportExports(
                'exam-1',
                undefined,
                undefined,
                'institution-1',
            ),
        });
    });

    it('does not poll or enable exam-report status queries without an export id', () => {
        const query = useExamReportExportStatusQuery({
            payload: {
                institutionId: 'institution-1',
                examId: 'exam-1',
                exportId: null,
            },
        }) as any;

        expect(query.enabled).toBe(false);
        expect(query.refetchIntervalValue).toBe(false);
    });

    it('respects disabled query flags for exam-report lists', () => {
        const query = useExamReportExportsQuery({
            enabled: false,
            payload: {
                institutionId: 'institution-1',
                examId: 'exam-1',
            },
        }) as any;

        expect(query.enabled).toBe(false);
    });

    it('invalidates only the targeted analytics report list after queueing a report', async () => {
        const mutation = useGenerateAnalyticsReportMutation();

        await (mutation as any).mutateAsync({
            title: 'Overall Report',
            institutionId: 'institution-1',
            period: 'LAST_30_DAYS',
            timezone: 'Asia/Manila',
        });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: [...ANALYTICS_QUERY_KEYS.all, 'reports'],
        });
    });

    it('requests a fresh signed analytics download URL on each click', async () => {
        const mutation = useAnalyticsReportDownloadMutation();

        await (mutation as any).mutateAsync('report-1');
        await (mutation as any).mutateAsync('report-1');

        expect(getAnalyticsReportDownload).toHaveBeenCalledTimes(2);
        expect(getAnalyticsReportDownload).toHaveBeenNthCalledWith(
            1,
            { mockClient: true },
            'report-1',
        );
        expect(getAnalyticsReportDownload).toHaveBeenNthCalledWith(
            2,
            { mockClient: true },
            'report-1',
        );
    });

    it('requests a fresh signed exam-report download URL on each click', async () => {
        const mutation = useExamReportExportDownloadMutation();

        await (mutation as any).mutateAsync('export-1');
        await (mutation as any).mutateAsync('export-1');

        expect(getExamReportExportDownload).toHaveBeenCalledTimes(2);
        expect(getExamReportExportDownload).toHaveBeenNthCalledWith(
            1,
            { mockClient: true },
            'export-1',
        );
        expect(getExamReportExportDownload).toHaveBeenNthCalledWith(
            2,
            { mockClient: true },
            'export-1',
        );
    });

    it('preserves caller callbacks while invalidating targeted retry/delete caches', async () => {
        const onRetrySuccess = vi.fn();
        const onDeleteSuccess = vi.fn();

        const retryMutation = useRetryAnalyticsReportMutation({
            onSuccess: onRetrySuccess,
        });
        const deleteMutation = useDeleteAnswerKeyExportMutation({
            onSuccess: onDeleteSuccess,
        });

        await (retryMutation as any).mutateAsync({
            reportId: 'report-1',
            institutionId: 'institution-1',
            page: 3,
            limit: 25,
            status: 'FAILED',
        });
        await (deleteMutation as any).mutateAsync({
            exportId: 'export-1',
            institutionId: 'institution-1',
            examId: 'exam-1',
        });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.reports('institution-1', 3, 25, 'FAILED'),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.answerKeyExports('institution-1', 'exam-1'),
        });
        expect(mockRemoveQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.answerKeyExportStatus('export-1'),
        });
        expect(onRetrySuccess).toHaveBeenCalledOnce();
        expect(onDeleteSuccess).toHaveBeenCalledOnce();
    });

    it('invalidates only the targeted exam-report lifecycle caches for create retry and delete', async () => {
        const createMutation = useCreateExamReportExportMutation();
        const retryMutation = useRetryExamReportExportMutation();
        const deleteMutation = useDeleteExamReportExportMutation();

        await (createMutation as any).mutateAsync({
            exam_id: 'exam-1',
            title: 'Exam Report',
            institutionId: 'institution-1',
            page: 2,
            limit: 25,
        });
        await (retryMutation as any).mutateAsync({
            exportId: 'export-1',
            examId: 'exam-1',
            institutionId: 'institution-1',
            page: 2,
            limit: 25,
        });
        await (deleteMutation as any).mutateAsync({
            exportId: 'export-1',
            examId: 'exam-1',
            institutionId: 'institution-1',
            page: 2,
            limit: 25,
        });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.examReportExports('exam-1', 2, 25, 'institution-1'),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.examReportExportStatus('exam-1', 'export-1'),
        });
        expect(mockRemoveQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.examReportExportStatus('exam-1', 'export-1'),
        });
    });

    it('preserves errors for exam-report download mutations', async () => {
        const error = new Error('signed url failed');
        (getExamReportExportDownload as any).mockRejectedValueOnce(error);

        const mutation = useExamReportExportDownloadMutation();

        await expect((mutation as any).mutateAsync('export-1')).rejects.toThrow(
            'signed url failed',
        );
    });

    it('passes selected exam id unchanged through preview mutations', async () => {
        const mutation = usePreviewPdfTemplateMutation();
        const payload = {
            institution_id: 'institution-1',
            exam_id: 'exam-1',
            document_kind: 'EXAM_ANSWER_KEY',
            header_config: {
                logo_visible: true,
                logo_placement: 'LEFT',
                logo_max_size_px: 120,
                title_text: 'Preview',
                title_alignment: 'LEFT',
                subtitle_alignment: 'LEFT',
                divider_visible: true,
                divider_color: '#D1D5DB',
                accent_color: '#3B82F6',
                sentinel_logo_visible: true,
            },
            footer_config: {
                text: 'Footer',
                divider_visible: true,
                divider_color: '#E5E7EB',
                page_number_visible: true,
                page_number_format: 'PAGE_X_OF_Y',
            },
        };

        await (mutation as any).mutateAsync(payload);

        expect(previewPdfTemplate).toHaveBeenCalledWith({ mockClient: true }, payload);
    });

    it('invalidates only the targeted answer-key lifecycle caches for create, retry, and delete', async () => {
        (createAnswerKeyExport as any).mockResolvedValueOnce({
            exportId: 'export-1',
            examId: 'exam-1',
            institutionId: 'institution-1',
            status: 'PENDING',
        });
        (retryAnswerKeyExport as any).mockResolvedValueOnce({
            success: true,
            message: 'queued',
        });

        const createMutation = useCreateAnswerKeyExportMutation();
        const retryMutation = useRetryAnswerKeyExportMutation();
        const deleteMutation = useDeleteAnswerKeyExportMutation();

        await (createMutation as any).mutateAsync({
            exam_id: 'exam-1',
            title: 'Answer Key',
            institution_id: 'institution-1',
        });
        await (retryMutation as any).mutateAsync({
            exportId: 'export-1',
            examId: 'exam-1',
            institutionId: 'institution-1',
        });
        await (deleteMutation as any).mutateAsync({
            exportId: 'export-1',
            examId: 'exam-1',
            institutionId: 'institution-1',
        });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.answerKeyExports('institution-1', 'exam-1'),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.answerKeyExportStatus('export-1'),
        });
        expect(mockRemoveQueries).toHaveBeenCalledWith({
            queryKey: ANALYTICS_QUERY_KEYS.answerKeyExportStatus('export-1'),
        });
    });

    it('requests a fresh signed answer-key download URL on each click', async () => {
        (getAnswerKeyExportDownload as any).mockResolvedValue({
            success: true,
            downloadUrl: 'https://signed.example/answer-key-1.pdf',
        });

        const mutation = useAnswerKeyExportDownloadMutation();

        await (mutation as any).mutateAsync('export-1');
        await (mutation as any).mutateAsync('export-1');

        expect(getAnswerKeyExportDownload).toHaveBeenCalledTimes(2);
        expect(getAnswerKeyExportDownload).toHaveBeenNthCalledWith(
            1,
            { mockClient: true },
            'export-1',
        );
    });

    it('polls answer-key status only while pending or generating', () => {
        const pendingQuery = useAnswerKeyExportStatusQuery('export-1', {
            mockQueryData: {
                status: 'PENDING',
            } as any,
        } as any) as any;

        const readyQuery = useAnswerKeyExportStatusQuery('export-1', {
            mockQueryData: {
                status: 'READY',
            } as any,
        } as any) as any;

        expect(pendingQuery.refetchIntervalValue).toBe(5000);
        expect(readyQuery.refetchIntervalValue).toBe(false);
    });
});
