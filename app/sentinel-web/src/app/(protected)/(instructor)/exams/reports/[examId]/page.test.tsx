import { Suspense } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExamReportPage from './page';
import ExamReportLayout from './layout';

const {
    mockApiClient,
    mockRefetch,
    mockUseExamReportQuery,
    mockUseExamQuery,
    mockSearchParamsGet,
    mockPathname,
    mockRouterPush,
} = vi.hoisted(() => ({
    mockApiClient: vi.fn(),
    mockRefetch: vi.fn(),
    mockUseExamReportQuery: vi.fn(),
    mockUseExamQuery: vi.fn(),
    mockSearchParamsGet: vi.fn().mockReturnValue(null),
    mockPathname: vi.fn().mockReturnValue('/exams/reports/exam-1'),
    mockRouterPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname(),
    useSearchParams: () => ({
        get: mockSearchParamsGet,
        toString: () => '',
    }),
    useParams: () => ({ examId: 'exam-1' }),
    useRouter: () => ({
        push: mockRouterPush,
    }),
}));

vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        className,
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
    }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
    useExamReportQuery: mockUseExamReportQuery,
    useExamQuery: mockUseExamQuery,
    useBatchCreateExamOverridesMutation: () => ({
        mutateAsync: vi.fn(),
        isPending: false,
    }),
}));


vi.mock('@sentinel/services', () => ({
    createStudentExamAccessOverride: vi.fn(),
}));

vi.mock('@/features/exams/logs', () => ({
    IncidentLogsView: ({ examId }: { examId: string }) => (
        <div data-testid="incident-logs-view">Incident Logs for {examId}</div>
    ),
}));

vi.mock('./_components/exam-report-pdf-export', () => ({
    ExamReportPdfExport: ({ examId, variant }: { examId: string; variant?: string }) => (
        <button type="button" data-testid="exam-report-pdf-export" data-variant={variant}>
            Export Results PDF for {examId}
        </button>
    ),
}));

vi.mock('@sentinel/ui', () => ({
    AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AlertDialogAction: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Button: ({
        children,
        onClick,
        disabled,
        asChild,
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        asChild?: boolean;
    }) =>
        asChild ? (
            <>{children}</>
        ) : (
            <button type="button" onClick={onClick} disabled={disabled}>
                {children}
            </button>
        ),
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
    Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <button type="button">{children ?? value}</button>
    ),
    TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    Separator: () => <hr />,
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
    FacetedFilter: ({ title, options, selectedValues, onSelect, onClear }: any) => {
        return (
            <div>
                <span>{title}</span>
                <select
                    data-testid="faceted-filter"
                    value={Array.from(selectedValues)[0] ?? 'all'}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'all') {
                            onClear?.();
                        } else {
                            onSelect?.(val);
                        }
                    }}
                >
                    <option value="all">All sections</option>
                    {options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    },
    Checkbox: ({ checked, onCheckedChange, 'aria-label': ariaLabel }: any) => (
        <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            aria-label={ariaLabel}
        />
    ),
    Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
        open !== false ? <div>{children}</div> : null,
    DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
        <label htmlFor={htmlFor}>{children}</label>
    ),
    Textarea: ({ value, onChange, placeholder }: any) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} />
    ),
    DataTable: ({ columns, data, toolbarActions }: any) => {
        return (
            <div>
                {toolbarActions}
                <table>
                    <thead>
                        <tr>
                            {columns.map((c: any, i: number) => (
                                <th key={i}>{typeof c.header === 'string' ? c.header : ''}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row: any, i: number) => (
                            <tr key={i}>
                                {columns.map((c: any, j: number) => {
                                    const cellContent = c.cell
                                        ? c.cell({
                                              row: {
                                                  original: row,
                                                  getIsSelected: () => false,
                                                  toggleSelected: () => {},
                                              },
                                          })
                                        : null;
                                    return <td key={j}>{cellContent}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    },
}));


vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('ExamReportPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseExamReportQuery.mockReturnValue({
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
                sections: [
                    { id: 'section-1', name: 'BSCS 3A' },
                    { id: 'section-2', name: 'BSCS 3B' },
                ],
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
                    makeup: [],
                    retake: [],
                },
                studentsPagination: {
                    page: 1,
                    pageSize: 10,
                    total: 2,
                    totalPages: 1,
                    hasMore: false,
                },
            },
            isLoading: false,
            isError: false,
            refetch: mockRefetch,
            isFetching: false,
        });
        mockUseExamQuery.mockReturnValue({
            data: {
                id: 'exam-1',
                title: 'Final Exam',
            },
        });
    });

    it('passes the selected section filter into the report query', async () => {
        const params = Promise.resolve({ examId: 'exam-1' });
        mockSearchParamsGet.mockReturnValue('attempts');

        await act(async () => {
            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <ExamReportPage params={params} />
                </Suspense>,
            );

            await params;
        });

        expect(await screen.findByText('Santos, Ana')).toBeTruthy();
        expect(screen.getByText('Reyes, Luis')).toBeTruthy();

        fireEvent.change(screen.getAllByRole('combobox')[0], {
            target: { value: 'section-2' },
        });

        expect(mockUseExamReportQuery).toHaveBeenLastCalledWith('exam-1', {
            search: undefined,
            sectionId: 'section-2',
            page: 1,
            pageSize: 10,
        });
        expect(screen.getAllByText('BSCS 3B').length).toBeGreaterThan(0);
        mockSearchParamsGet.mockReturnValue(null);
    });

    it('links each submitted attempt into the detailed report route', async () => {
        const params = Promise.resolve({ examId: 'exam-1' });
        mockSearchParamsGet.mockReturnValue('attempts');

        await act(async () => {
            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <ExamReportPage params={params} />
                </Suspense>,
            );

            await params;
        });

        expect(
            screen
                .getAllByRole('link', { name: 'View Attempt' })
                .map((link) => link.getAttribute('href')),
        ).toContain('/exams/reports/exam-1/attempt-1');
        mockSearchParamsGet.mockReturnValue(null);
    });

    it('initializes activeSection from search parameters', async () => {
        const params = Promise.resolve({ examId: 'exam-1' });
        mockSearchParamsGet.mockReturnValue('attempts');

        await act(async () => {
            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <ExamReportPage params={params} />
                </Suspense>,
            );
            await params;
        });

        // The attempts summary view should be rendered
        expect(screen.getAllByText('Attempt Summary Report').length).toBeGreaterThan(0);
        mockSearchParamsGet.mockReturnValue(null);
    });

    it('renders Incident Logs section when section is logs', async () => {
        const params = Promise.resolve({ examId: 'exam-1' });
        mockSearchParamsGet.mockReturnValue('logs');

        await act(async () => {
            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <ExamReportPage params={params} />
                </Suspense>,
            );
            await params;
        });

        expect(screen.getByTestId('incident-logs-view')).toBeTruthy();
        expect(screen.getByText('Incident Logs for exam-1')).toBeTruthy();
        mockSearchParamsGet.mockReturnValue(null);
    });

    it('renders each query-selected view while its matching navigation link is active in shell', async () => {
        // Overview default
        mockSearchParamsGet.mockImplementation((key: string) =>
            key === 'section' ? 'overview' : null,
        );
        const overviewParams = Promise.resolve({ examId: 'exam-1' });
        let viewResult: any;

        await act(async () => {
            viewResult = render(
                <ExamReportLayout>
                    <ExamReportPage params={overviewParams} />
                </ExamReportLayout>,
            );
            await overviewParams;
        });
        expect(screen.getByText('Final Exam')).toBeTruthy();
        expect(screen.getAllByRole('link', { name: 'Overview' })[0]?.className).toContain(
            'bg-accent/50',
        );
        viewResult.unmount();

        // Attempt Summary
        mockSearchParamsGet.mockImplementation((key: string) =>
            key === 'section' ? 'attempts' : null,
        );
        const attemptsParams = Promise.resolve({ examId: 'exam-1' });
        await act(async () => {
            viewResult = render(
                <ExamReportLayout>
                    <ExamReportPage params={attemptsParams} />
                </ExamReportLayout>,
            );
            await attemptsParams;
        });
        expect(screen.getAllByText('Attempt Summary Report').length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: 'Attempt Summary' })[0]?.className).toContain(
            'bg-accent/50',
        );
        viewResult.unmount();

        // Action Queue
        mockSearchParamsGet.mockImplementation((key: string) =>
            key === 'section' ? 'queue' : null,
        );
        const queueParams = Promise.resolve({ examId: 'exam-1' });
        await act(async () => {
            viewResult = render(
                <ExamReportLayout>
                    <ExamReportPage params={queueParams} />
                </ExamReportLayout>,
            );
            await queueParams;
        });
        expect(screen.getAllByRole('link', { name: 'Action Queue' })[0]?.className).toContain(
            'bg-accent/50',
        );
        viewResult.unmount();

        // Incident Logs
        mockSearchParamsGet.mockImplementation((key: string) =>
            key === 'section' ? 'logs' : null,
        );
        const logsParams = Promise.resolve({ examId: 'exam-1' });
        await act(async () => {
            viewResult = render(
                <ExamReportLayout>
                    <ExamReportPage params={logsParams} />
                </ExamReportLayout>,
            );
            await logsParams;
        });
        expect(screen.getAllByTestId('incident-logs-view')[0]).toBeTruthy();
        expect(screen.getAllByRole('link', { name: 'Incident Logs' })[0]?.className).toContain(
            'bg-accent/50',
        );
        viewResult.unmount();
        mockSearchParamsGet.mockReturnValue(null);
    });

    it('renders the export action on the overview without refetching the attempts table source', async () => {
        const params = Promise.resolve({ examId: 'exam-1' });

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
                .compareDocumentPosition(screen.getByText('Back to Reports')),
        ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(mockUseExamReportQuery).toHaveBeenCalledTimes(1);
        expect(mockRefetch).not.toHaveBeenCalled();
    });
});
