'use client';

import { Suspense } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import ExamReportPage from './page';

const { mockApiClient, mockRefetch } = vi.hoisted(() => ({
    mockApiClient: vi.fn(),
    mockRefetch: vi.fn(),
}));

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('./_components/exam-report-pdf-export', () => ({
    ExamReportPdfExport: ({ examId, variant }: { examId: string; variant?: string }) => (
        <button type="button" data-testid="exam-report-pdf-export" data-variant={variant}>
            Export Results PDF for {examId}
        </button>
    ),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
    useExamReportQuery: () => ({
        data: {
            exam: {
                id: 'exam-1',
                title: 'Final Exam',
                subject: 'Algorithms',
                scheduledDate: '2026-04-20T09:00:00.000Z',
                endDateTime: '2026-04-20T10:00:00.000Z',
                durationMinutes: 60,
                passingScore: 75,
            },
            summary: {
                totalAssignedStudents: 2,
                totalStarted: 2,
                totalSubmitted: 2,
                totalAbsent: 0,
                flaggedStudentsCount: 0,
                averageScore: 90,
                passRate: 100,
                incidentBreakdownByType: [],
                incidentBreakdownBySeverity: [],
                needsReviewCount: 0,
                needsMakeupCount: 0,
                needsRetakeCount: 0,
            },
            students: [
                {
                    id: 'student-1',
                    studentId: 'student-record-1',
                    attemptId: 'attempt-1',
                    studentNo: '2024-0001',
                    firstName: 'Ana',
                    lastName: 'Santos',
                    sectionId: 'section-1',
                    sectionName: 'BSCS 3A',
                    status: 'submitted',
                    startedAt: '2026-04-20T09:00:00.000Z',
                    completedAt: '2026-04-20T09:45:00.000Z',
                    score: 90,
                    totalScore: 100,
                    percentage: 90,
                    timeSpentMinutes: 45,
                    incidentCount: 0,
                    openIncidentCount: 0,
                    primaryIncidentType: null,
                    highestIncidentSeverity: null,
                    incidentOutcomes: {
                        pending: 0,
                        reviewed: 0,
                        confirmed: 0,
                        dismissed: 0,
                    },
                    submissionType: 'manual_submit',
                    attemptKind: 'primary',
                    attemptCount: 1,
                    isFlagged: false,
                    needsReview: false,
                    needsMakeup: false,
                    needsRetake: false,
                },
                {
                    id: 'student-2',
                    studentId: 'student-record-2',
                    attemptId: 'attempt-2',
                    studentNo: '2024-0002',
                    firstName: 'Luis',
                    lastName: 'Reyes',
                    sectionId: 'section-2',
                    sectionName: 'BSCS 3B',
                    status: 'submitted',
                    startedAt: '2026-04-20T09:00:00.000Z',
                    completedAt: '2026-04-20T09:50:00.000Z',
                    score: 95,
                    totalScore: 100,
                    percentage: 95,
                    timeSpentMinutes: 50,
                    incidentCount: 0,
                    openIncidentCount: 0,
                    primaryIncidentType: null,
                    highestIncidentSeverity: null,
                    incidentOutcomes: {
                        pending: 0,
                        reviewed: 0,
                        confirmed: 0,
                        dismissed: 0,
                    },
                    submissionType: 'manual_submit',
                    attemptKind: 'primary',
                    attemptCount: 1,
                    isFlagged: false,
                    needsReview: false,
                    needsMakeup: false,
                    needsRetake: false,
                },
            ],
            actionItems: {
                review: [],
                makeup: [
                    {
                        id: 'queue-1',
                        studentId: 'student-record-1',
                        attemptId: 'attempt-1',
                        studentNo: '2024-0001',
                        firstName: 'Ana',
                        lastName: 'Santos',
                        reason: 'Needs makeup',
                    },
                ],
                retake: [
                    {
                        id: 'queue-2',
                        studentId: 'student-record-2',
                        attemptId: 'attempt-2',
                        studentNo: '2024-0002',
                        firstName: 'Luis',
                        lastName: 'Reyes',
                        reason: 'Needs retake',
                    },
                ],
            },
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
        isFetching: false,
    }),
}));

vi.mock('@sentinel/services', () => ({
    createStudentExamAccessOverride: vi.fn(),
}));

vi.mock('@sentinel/ui', () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
        open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Button: ({
        children,
        onClick,
        disabled,
        asChild,
        type = 'button',
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        asChild?: boolean;
        type?: 'button' | 'submit' | 'reset';
    }) =>
        asChild ? (
            <>{children}</>
        ) : (
            <button type={type} onClick={onClick} disabled={disabled}>
                {children}
            </button>
        ),
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Input: ({
        value,
        onChange,
        placeholder,
        className,
    }: {
        value?: string;
        onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        className?: string;
    }) => (
        <input value={value} onChange={onChange} placeholder={placeholder} className={className} />
    ),
    ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Select: ({
        value,
        onValueChange,
        children,
    }: {
        value?: string;
        onValueChange?: (value: string) => void;
        children: React.ReactNode;
    }) => (
        <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
            {children}
        </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <option value={value}>{children}</option>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
    Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
    TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
    TableCell: ({
        children,
        colSpan,
        className,
    }: {
        children: React.ReactNode;
        colSpan?: number;
        className?: string;
    }) => (
        <td colSpan={colSpan} className={className}>
            {children}
        </td>
    ),
    TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
    TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
    TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('ExamReportPage', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockApiClient.mockResolvedValue({
            remediationExam: {
                examId: 'remediation-exam-1',
                title: 'Final Exam (Makeup)',
            },
            remediationSchedule: {
                scheduledDate: '2026-04-21T09:00:00.000Z',
            },
        });
    });

    it('filters the report table by section', async () => {
        const params = Promise.resolve({ id: 'exam-1' });

        await act(async () => {
            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <ExamReportPage params={params} />
                </Suspense>,
            );

            await params;
        });

        expect((await screen.findAllByText('Santos, Ana')).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Reyes, Luis').length).toBeGreaterThan(0);

        fireEvent.change(screen.getAllByRole('combobox')[0], {
            target: { value: 'section-2' },
        });

        expect(screen.getAllByText('Santos, Ana').length).toBe(1);
        expect(screen.getAllByText('Reyes, Luis').length).toBeGreaterThan(0);
        expect(screen.getAllByText('BSCS 3B').length).toBeGreaterThan(0);
    });

    it('grants a makeup window through the lifecycle endpoint', async () => {
        const params = Promise.resolve({ id: 'exam-1' });

        await act(async () => {
            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <ExamReportPage params={params} />
                </Suspense>,
            );

            await params;
        });

        await act(async () => {
            fireEvent.click(screen.getAllByRole('button', { name: 'Grant Makeup' })[0]);
        });

        await act(async () => {
            const form = screen.getByText('Start Date & Time').closest('form')!;
            fireEvent.submit(form);
        });

        expect(mockApiClient).toHaveBeenCalledWith(
            '/exams/exam-1/students/student-record-1/lifecycle/grant-makeup',
            expect.objectContaining({
                method: 'POST',
            }),
        );
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Final Exam (Makeup)'));
        expect(mockRefetch).toHaveBeenCalled();
    });

    it('grants a retake window through the lifecycle endpoint with the source attempt id', async () => {
        const params = Promise.resolve({ id: 'exam-1' });

        await act(async () => {
            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <ExamReportPage params={params} />
                </Suspense>,
            );

            await params;
        });

        await act(async () => {
            fireEvent.click(screen.getAllByRole('button', { name: 'Grant Retake' })[0]);
        });

        await act(async () => {
            const form = screen.getByText('Start Date & Time').closest('form')!;
            fireEvent.submit(form);
        });

        expect(mockApiClient).toHaveBeenCalledWith(
            '/exams/exam-1/students/student-record-2/lifecycle/grant-retake',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"sourceAttemptId":"attempt-2"'),
            }),
        );
        expect(toast.success).toHaveBeenCalled();
        expect(mockRefetch).toHaveBeenCalled();
    });

    it('renders the export action beside the report header controls without refetching the table', async () => {
        const params = Promise.resolve({ id: 'exam-1' });

        await act(async () => {
            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <ExamReportPage params={params} />
                </Suspense>,
            );

            await params;
        });

        expect(screen.getByTestId('exam-report-pdf-export').textContent).toContain(
            'Export Results PDF for exam-1',
        );
        expect(screen.getByTestId('exam-report-pdf-export').dataset.variant).toBe('button');
        expect(
            screen
                .getByTestId('exam-report-pdf-export')
                .compareDocumentPosition(screen.getByText('Back to Exams')),
        ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(mockRefetch).not.toHaveBeenCalled();
    });
});
