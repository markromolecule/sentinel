import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiIncidentLogItem } from '@sentinel/services';
import { IncidentDrawer } from './incident-drawer';

const mockUseIncidentEvidenceQuery = vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
}));

vi.mock('@sentinel/hooks', () => ({
    useIncidentEvidenceQuery: (...args: any[]) => mockUseIncidentEvidenceQuery(...args),
}));

vi.mock('@sentinel/ui', () => ({
    Sheet: ({ open, children }: any) => (open ? <div>{children}</div> : null),
    SheetContent: ({ children, className }: any) => <div className={className}>{children}</div>,
    SheetHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
    SheetTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
    SheetDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
    Textarea: (props: any) => <textarea {...props} />,
    cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
}));

const incident: ApiIncidentLogItem = {
    incidentId: 'incident-1',
    attemptId: 'attempt-1',
    examId: 'exam-1',
    examTitle: 'Algorithms Final',
    institutionId: 'institution-1',
    studentId: 'student-user-1',
    studentRecordId: 'student-record-1',
    studentName: 'Ana Santos',
    studentNo: '2024-0001',
    sectionId: 'section-1',
    sectionName: 'BSCS 4A',
    platform: 'WEB',
    source: 'CLIENT',
    ruleKey: 'webSecurity.tab_switching_monitor',
    incidentType: 'TAB_SWITCH',
    severity: 'MEDIUM',
    status: 'PENDING',
    timestamp: '2026-04-20T09:40:00.000Z',
    evidenceUrl: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    configurationSnapshot: null,
    sessionContext: null,
    elapsedSeconds: 120,
    details: {
        occurrenceCount: 3,
        severityReason: 'repeat-escalated',
        severityInputs: {
            baseSeverity: 'LOW',
            ladder: ['LOW', 'MEDIUM', 'HIGH'],
            matchingCount: 3,
            matchingWindowSeconds: 300,
            repeatThreshold: 3,
            overrideSeverity: null,
        },
    },
};

describe('IncidentDrawer', () => {
    it('renders calibrated severity details from incident metadata', () => {
        render(
            <IncidentDrawer
                incident={incident}
                isOpen
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                onDismiss={vi.fn()}
                isSubmitting={false}
            />,
        );

        expect(screen.getByText('Occurrences')).toBeTruthy();
        expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Severity Reason')).toBeTruthy();
        expect(screen.getByText('Repeat escalated')).toBeTruthy();
        expect(screen.getByText('Severity Ladder')).toBeTruthy();
        expect(screen.getByText('LOW -> MEDIUM -> HIGH')).toBeTruthy();
        expect(screen.getByText('No evidence frame is available for this incident.')).toBeTruthy();
    });

    it('passes lifecycle follow-up details when confirm-and-close is selected', () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);

        render(
            <IncidentDrawer
                incident={incident}
                isOpen
                onClose={vi.fn()}
                onConfirm={onConfirm}
                onDismiss={vi.fn()}
                isSubmitting={false}
            />,
        );

        fireEvent.click(screen.getAllByText('Confirm and close attempt').at(-1)!);
        fireEvent.change(
            screen.getByPlaceholderText('Add follow-up notes for the attempt lifecycle action...'),
            {
                target: { value: 'close this attempt now' },
            },
        );
        fireEvent.click(screen.getAllByText('Confirm Violation').at(-1)!);

        expect(onConfirm).toHaveBeenCalledWith(['incident-1'], {
            reviewNotes: '',
            lifecycleAction: 'CLOSE_ATTEMPT',
            reasonCode: 'CONFIRMED_INCIDENT_CLOSE',
            notes: 'close this attempt now',
        });
    });

    it('renders linked evidence returned by the incident evidence query', () => {
        mockUseIncidentEvidenceQuery.mockReturnValueOnce({
            data: [
                {
                    evidenceId: 'evidence-1',
                    attemptId: 'attempt-1',
                    incidentId: 'incident-1',
                    eventId: 'event-1',
                    eventType: 'GAZE',
                    capturedAt: '2026-04-20T09:40:00.000Z',
                    state: 'AVAILABLE',
                    expiresAt: '2026-04-27T09:40:00.000Z',
                    signedUrl: 'https://example.com/evidence.png',
                },
            ],
            isLoading: false,
            isError: false,
        });

        render(
            <IncidentDrawer
                incident={incident}
                isOpen
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                onDismiss={vi.fn()}
                isSubmitting={false}
            />,
        );

        const image = screen.getByAltText('Incident Evidence Snapshot');
        expect(image).toBeTruthy();
        expect(image.getAttribute('src')).toBe('https://example.com/evidence.png');
    });
});
