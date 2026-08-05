import { describe, expect, it } from 'vitest';
import { mapSourceToViewModel } from './exam-results-report-view-model';

describe('mapSourceToViewModel', () => {
    const baseSource = {
        examId: 'exam-1',
        institutionId: 'institution-1',
        examTitle: 'Final Exam',
        subjectCode: 'MATH-101',
        subjectName: 'Mathematics',
        durationMinutes: 60,
        passingScore: 75,
        scheduledDate: '2026-08-01T08:00:00.000Z',
        endDateTime: '2026-08-01T09:00:00.000Z',
        institutionName: 'Sentinel School',
        generatedBy: 'Jordan Instructor',
        report: {
            summary: {
                totalAssignedStudents: 2,
                totalSubmitted: 2,
                totalAbsent: 0,
                averageScore: 90,
                passRate: 100,
                incidentBreakdownByType: [],
            },
            students: [],
        },
    } as any;

    it('preserves student section names and exposes a stable section list', () => {
        const source = {
            ...baseSource,
            report: {
                ...baseSource.report,
                students: [
                    {
                        id: 'student-1',
                        studentId: 'student-record-1',
                        studentNo: '2024-0001',
                        firstName: 'Ana',
                        lastName: 'Santos',
                        sectionId: 'sec-B',
                        sectionName: 'BSCS 3B',
                        score: 95,
                        status: 'submitted',
                        attemptKind: 'primary',
                        activeOverrideType: null,
                        incidentOutcomes: {
                            pending: 0,
                            reviewed: 0,
                            confirmed: 0,
                            dismissed: 0,
                        },
                        incidentsPending: 0,
                        incidentsReviewed: 0,
                        incidentsConfirmed: 0,
                        incidentsDismissed: 0,
                    },
                    {
                        id: 'student-2',
                        studentId: 'student-record-2',
                        studentNo: '2024-0002',
                        firstName: 'Luis',
                        lastName: 'Reyes',
                        sectionId: 'sec-A',
                        sectionName: 'BSCS 3A',
                        score: 88,
                        status: 'submitted',
                        attemptKind: 'primary',
                        activeOverrideType: null,
                        incidentOutcomes: {
                            pending: 0,
                            reviewed: 0,
                            confirmed: 0,
                            dismissed: 0,
                        },
                        incidentsPending: 0,
                        incidentsReviewed: 0,
                        incidentsConfirmed: 0,
                        incidentsDismissed: 0,
                    },
                    {
                        id: 'student-3',
                        studentId: 'student-record-3',
                        studentNo: '2024-0003',
                        firstName: 'Mina',
                        lastName: 'Cruz',
                        sectionId: null,
                        sectionName: null,
                        score: null,
                        status: 'absent',
                        attemptKind: null,
                        activeOverrideType: null,
                        incidentOutcomes: {
                            pending: 0,
                            reviewed: 0,
                            confirmed: 0,
                            dismissed: 0,
                        },
                        incidentsPending: 0,
                        incidentsReviewed: 0,
                        incidentsConfirmed: 0,
                        incidentsDismissed: 0,
                    },
                ],
            },
        };

        const viewModel = mapSourceToViewModel(source);

        expect(viewModel.students.map((student) => student.sectionName)).toEqual([
            'BSCS 3B',
            'BSCS 3A',
            'Unassigned',
        ]);
        expect(viewModel.sections).toEqual([
            { sectionName: 'BSCS 3A', totalStudents: 1, averageScore: 88, passRate: 100 },
            { sectionName: 'BSCS 3B', totalStudents: 1, averageScore: 95, passRate: 100 },
            { sectionName: 'Unassigned', totalStudents: 1, averageScore: 0, passRate: 0 },
        ]);
    });

    it('groups unassigned students into a stable fallback section summary', () => {
        const viewModel = mapSourceToViewModel({
            ...baseSource,
            report: {
                ...baseSource.report,
                students: [
                    {
                        id: 'student-1',
                        studentId: 'student-record-1',
                        studentNo: '2024-0001',
                        firstName: 'Ana',
                        lastName: 'Santos',
                        sectionId: null,
                        sectionName: null,
                        score: null,
                        status: 'absent',
                        attemptKind: null,
                        activeOverrideType: null,
                        incidentOutcomes: {
                            pending: 0,
                            reviewed: 0,
                            confirmed: 0,
                            dismissed: 0,
                        },
                        incidentsPending: 0,
                        incidentsReviewed: 0,
                        incidentsConfirmed: 0,
                        incidentsDismissed: 0,
                    },
                ],
            },
        });

        expect(viewModel.sections).toEqual([
            { sectionName: 'Unassigned', totalStudents: 1, averageScore: 0, passRate: 0 },
        ]);
    });
});
