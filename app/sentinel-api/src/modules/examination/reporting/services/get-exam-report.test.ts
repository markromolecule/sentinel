import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { buildCompleteExamReport, getExamReport } from './get-exam-report';
import { getReportingExamContext } from './get-reporting-exam-context';
import { loadExamReportSourceData } from './exam-report-queries';

vi.mock('./get-reporting-exam-context', () => ({
    getReportingExamContext: vi.fn(),
}));

vi.mock('./exam-report-queries', () => ({
    loadExamReportSourceData: vi.fn(),
    buildOverrideRecencyMaps: vi.fn().mockReturnValue({
        overrideAttemptKindMap: new Map(),
        activeOverrideMap: new Map(),
    }),
}));

describe('get-exam-report services', () => {
    const mockExamContext = {
        examId: 'exam-1',
        title: 'Midterm Exam',
        subject: 'History',
        durationMinutes: 60,
        passingScore: 70,
        assignedSectionIds: ['sec-A'],
        institutionId: 'inst-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getReportingExamContext).mockResolvedValue(mockExamContext as any);
    });

    it('buildCompleteExamReport returns all students without pagination', async () => {
        // Create 150 students to prove it exceeds the 100-student HTTP pagination page size limit
        const studentRows = Array.from({ length: 150 }, (_, i) => ({
            student_record_id: `student-${i}`,
            student_user_id: `user-${i}`,
            first_name: `First-${i}`,
            last_name: `Last-${i}`,
            section_id: 'sec-A',
            section_name: 'Section A',
            attempt_id: `attempt-${i}`,
            score: 80,
            status: 'COMPLETED',
        }));

        vi.mocked(loadExamReportSourceData).mockResolvedValue({
            studentRows,
            incidentTypeBreakdown: [],
            incidentSeverityBreakdown: [],
            accessOverrides: [],
            remediationRowsByStudentId: new Map(),
        } as any);

        const report = await buildCompleteExamReport({
            dbClient: {} as DbClient,
            examId: 'exam-1',
            institutionId: 'inst-1',
            viewerRole: 'admin',
            userId: 'viewer-1',
        });

        expect(report.exam.title).toBe('Midterm Exam');
        expect(report.students).toHaveLength(150);
        expect(report.sections).toEqual([{ id: 'sec-A', name: 'Section A' }]);
    });

    it('getExamReport pagination and search filters behave correctly', async () => {
        const studentRows = [
            {
                student_record_id: 's1',
                student_user_id: 'u1',
                first_name: 'Alice',
                last_name: 'Smith',
                section_id: 'sec-A',
                section_name: 'Section A',
                attempt_id: 'a1',
                score: 85,
                status: 'COMPLETED',
            },
            {
                student_record_id: 's2',
                student_user_id: 'u2',
                first_name: 'Bob',
                last_name: 'Jones',
                section_id: 'sec-B',
                section_name: 'Section B',
                attempt_id: 'a2',
                score: 90,
                status: 'COMPLETED',
            },
        ];

        vi.mocked(loadExamReportSourceData).mockResolvedValue({
            studentRows,
            incidentTypeBreakdown: [],
            incidentSeverityBreakdown: [],
            accessOverrides: [],
            remediationRowsByStudentId: new Map(),
        } as any);

        // Filter by section B
        const report = await getExamReport({
            dbClient: {} as DbClient,
            examId: 'exam-1',
            institutionId: 'inst-1',
            viewerRole: 'admin',
            userId: 'viewer-1',
            sectionId: 'sec-B',
            page: 1,
            pageSize: 10,
        });

        expect(report.students).toHaveLength(1);
        expect(report.students[0].firstName).toBe('Bob');
        expect(report.studentsPagination).toMatchObject({
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
        });
    });
});
