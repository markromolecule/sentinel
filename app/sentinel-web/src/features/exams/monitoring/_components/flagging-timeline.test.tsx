import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Flag } from '@sentinel/shared/types';
import { FlaggingTimeline } from './flagging-timeline';

vi.mock('./incident-evidence-gallery', () => ({
    IncidentEvidenceGallery: ({ flag }: { flag: Flag }) =>
        (flag.evidenceCount ?? 0) > 0 || flag.evidenceUrl ? (
            <div>Evidence gallery for {flag.id}</div>
        ) : null,
}));

describe('FlaggingTimeline', () => {
    afterEach(() => {
        cleanup();
    });

    it('surfaces the raw fullscreen trigger before the normalized incident bucket', () => {
        const flags: Flag[] = [
            {
                id: '123e4567-e89b-12d3-a456-426614174000',
                type: 'TAB_SWITCH',
                rawEventType: 'FULL_SCREEN_EXIT',
                timestamp: '2026-04-23T14:07:40.000Z',
                description: 'Tab Switch Detected',
                severity: 'medium',
                occurrenceCount: 1,
            },
        ];

        render(<FlaggingTimeline flags={flags} examId="exam-1" studentId="student-1" />);

        expect(screen.getByText('Fullscreen Exit Detected')).toBeTruthy();
        expect(screen.getByText(/exited required fullscreen mode/i)).toBeTruthy();
        expect(screen.getByText(/normalized as tab switch detected/i)).toBeTruthy();
        expect(screen.getByText('Trigger FULL_SCREEN_EXIT')).toBeTruthy();
    });

    it('surfaces right-click and print-screen raw browser security incidents', () => {
        const flags: Flag[] = [
            {
                id: '123e4567-e89b-12d3-a456-426614174001',
                type: 'SUSPICIOUS_MOVEMENT',
                rawEventType: 'RIGHT_CLICK_ATTEMPT',
                timestamp: '2026-04-23T14:08:40.000Z',
                description: 'Suspicious Movement',
                severity: 'low',
                occurrenceCount: 1,
            },
            {
                id: '123e4567-e89b-12d3-a456-426614174002',
                type: 'SCREENSHOT',
                rawEventType: 'PRINT_SCREEN_ATTEMPT',
                timestamp: '2026-04-23T14:09:40.000Z',
                description: 'Screenshot Attempt',
                severity: 'high',
                occurrenceCount: 1,
            },
        ];

        render(<FlaggingTimeline flags={flags} examId="exam-1" studentId="student-1" />);

        expect(screen.getByText('Right Click Attempt')).toBeTruthy();
        expect(screen.getByText(/browser context menu/i)).toBeTruthy();
        expect(screen.getByText('Trigger RIGHT_CLICK_ATTEMPT')).toBeTruthy();

        expect(screen.getByText('Screen Capture Attempt')).toBeTruthy();
        expect(screen.getByText(/screen-capture shortcut/i)).toBeTruthy();
        expect(screen.getByText('Trigger PRINT_SCREEN_ATTEMPT')).toBeTruthy();
    });

    it('does not render a duplicate occurrence label for first events', () => {
        const flags: Flag[] = [
            {
                id: '123e4567-e89b-12d3-a456-426614174003',
                type: 'TAB_SWITCH',
                rawEventType: 'TAB_SWITCH',
                timestamp: '2026-04-23T14:10:40.000Z',
                description: 'Tab Switch Detected',
                severity: 'low',
                occurrenceCount: 1,
                severityReason: 'default-ladder',
            },
        ];

        render(<FlaggingTimeline flags={flags} examId="exam-1" studentId="student-1" />);

        expect(screen.queryByText('x1')).toBeNull();
        expect(screen.getAllByText('low')).toHaveLength(1);
        expect(screen.getByText('Threshold triggered')).toBeTruthy();
    });

    it('renders occurrence count and calibrated severity details for repeated events', () => {
        const flags: Flag[] = [
            {
                id: '123e4567-e89b-12d3-a456-426614174004',
                type: 'TAB_SWITCH',
                rawEventType: 'TAB_SWITCH',
                timestamp: '2026-04-23T14:11:40.000Z',
                description: 'Tab Switch Detected',
                severity: 'medium',
                occurrenceCount: 3,
                severityReason: 'repeat-escalated',
                persistenceTrigger: 'repeat-threshold',
                matchingWindowSeconds: 300,
            },
        ];

        render(<FlaggingTimeline flags={flags} examId="exam-1" studentId="student-1" />);

        expect(screen.getByText('x3')).toBeTruthy();
        expect(screen.getAllByText('medium')).toHaveLength(1);
        expect(screen.getByText('Repeat escalated')).toBeTruthy();
        expect(screen.getByText('repeat threshold')).toBeTruthy();
        expect(screen.getByText('Window 5m')).toBeTruthy();
    });

    it('renders audio anomaly labels, confidence copy, and only shows x2 when the audio incident truly repeated', () => {
        const flags: Flag[] = [
            {
                id: '123e4567-e89b-12d3-a456-426614174005',
                type: 'AUDIO_DETECTED',
                rawEventType: 'AUDIO_ANOMALY',
                timestamp: '2026-04-23T14:12:40.000Z',
                description: 'Audio anomaly detected',
                severity: 'low',
                occurrenceCount: 1,
                anomalyType: 'BACKGROUND_NOISE',
                confidenceScore: 0.61,
                severityReason: 'default-ladder',
                persistenceTrigger: 'confidence-threshold',
            },
            {
                id: '123e4567-e89b-12d3-a456-426614174006',
                type: 'AUDIO_DETECTED',
                rawEventType: 'AUDIO_ANOMALY',
                timestamp: '2026-04-23T14:13:40.000Z',
                description: 'Audio anomaly detected',
                severity: 'medium',
                occurrenceCount: 2,
                anomalyType: 'TALKING',
                confidenceScore: 0.84,
                severityReason: 'repeat-escalated',
                persistenceTrigger: 'confidence-threshold',
                matchingWindowSeconds: 120,
            },
        ];

        render(<FlaggingTimeline flags={flags} examId="exam-1" studentId="student-1" />);

        expect(screen.getByText('Background Noise detected')).toBeTruthy();
        expect(screen.getByText('Talking detected')).toBeTruthy();
        expect(screen.getByText('84% confidence')).toBeTruthy();
        expect(screen.getAllByText('Trigger AUDIO_ANOMALY')).toHaveLength(2);
        expect(screen.getByText('x2')).toBeTruthy();
        expect(screen.queryByText('x1')).toBeNull();
    });

    it('renders the shared evidence gallery when incident evidence exists', () => {
        const flags: Flag[] = [
            {
                id: '123e4567-e89b-12d3-a456-426614174007',
                type: 'FACE_NOT_VISIBLE',
                rawEventType: 'NO_FACE_DETECTED',
                timestamp: '2026-04-23T14:14:40.000Z',
                description: 'Face Not Visible',
                severity: 'medium',
                evidenceCount: 2,
                evidenceStates: ['AVAILABLE', 'EXPIRED'],
            },
        ];

        render(<FlaggingTimeline flags={flags} examId="exam-1" studentId="student-1" />);

        expect(screen.getByText(/evidence gallery for 123e4567/i)).toBeTruthy();
    });
});
