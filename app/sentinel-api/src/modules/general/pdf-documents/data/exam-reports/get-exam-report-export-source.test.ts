import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { getExamReportExportSource } from './get-exam-report-export-source';
import { buildCompleteExamReport } from '../../../../examination/reporting/services/get-exam-report';
import { executeTransaction } from '@sentinel/db';

vi.mock('@sentinel/db', () => ({
    executeTransaction: vi.fn((cb) =>
        cb({
            selectFrom: vi.fn(),
        }),
    ),
}));

vi.mock('../../../../examination/reporting/services/get-exam-report', () => ({
    buildCompleteExamReport: vi.fn(),
}));

describe('getExamReportExportSource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws UnrecoverableError when exam is not found', async () => {
        const mockTrx = {
            selectFrom: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                executeTakeFirst: vi.fn().mockResolvedValue(undefined),
            }),
        };
        vi.mocked(executeTransaction).mockImplementation((cb) => cb(mockTrx as any));

        await expect(
            getExamReportExportSource({} as any, 'exam-uuid', 'inst-uuid'),
        ).rejects.toThrow(UnrecoverableError);
    });

    it('throws UnrecoverableError when exam institution does not match', async () => {
        const mockExam = {
            exam_id: 'exam-uuid',
            title: 'Algebra Exam',
            institution_id: 'other-institution',
        };
        const mockTrx = {
            selectFrom: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                executeTakeFirst: vi.fn().mockResolvedValue(mockExam),
            }),
        };
        vi.mocked(executeTransaction).mockImplementation((cb) => cb(mockTrx as any));

        await expect(
            getExamReportExportSource({} as any, 'exam-uuid', 'inst-uuid'),
        ).rejects.toThrow(UnrecoverableError);
    });

    it('returns loaded source data with resolved creator name', async () => {
        const mockExam = {
            exam_id: 'exam-uuid',
            title: 'Algebra Exam',
            duration_minutes: 60,
            passing_score: 70,
            scheduled_date: new Date('2026-08-01T08:00:00.000Z'),
            end_date_time: new Date('2026-08-01T09:00:00.000Z'),
            institution_id: 'inst-uuid',
            subject_code: 'MATH-101',
            subject_name: 'Mathematics',
            institution_name: 'Sentinel School',
        };

        const mockProfile = {
            first_name: 'John',
            last_name: 'Doe',
        };

        const mockReport = {
            exam: { id: 'exam-uuid' },
            students: [],
            sections: [],
        };

        const mockTrx = {
            selectFrom: vi.fn().mockImplementation((table: string) => {
                if (table.startsWith('exams')) {
                    return {
                        leftJoin: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        executeTakeFirst: vi.fn().mockResolvedValue(mockExam),
                    };
                } else if (table === 'user_profiles') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        executeTakeFirst: vi.fn().mockResolvedValue(mockProfile),
                    };
                }
                return {};
            }),
        };

        vi.mocked(executeTransaction).mockImplementation((cb) => cb(mockTrx as any));
        vi.mocked(buildCompleteExamReport).mockResolvedValue(mockReport as any);

        const result = await getExamReportExportSource(
            {} as any,
            'exam-uuid',
            'inst-uuid',
            'user-uuid',
        );

        expect(result.examId).toBe('exam-uuid');
        expect(result.generatedBy).toBe('John Doe');
        expect(result.report).toEqual(mockReport);
    });
});
