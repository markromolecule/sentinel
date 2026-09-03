import { describe, expect, it } from 'vitest';
import { resolveExamRuntimeAccess } from './runtime-access.service';

describe('resolveExamRuntimeAccess', () => {
    it('blocks both start and resume before the scheduled start time', () => {
        const access = resolveExamRuntimeAccess({
            scheduledDate: '2026-04-20T10:00:00.000Z',
            endDateTime: '2026-04-20T11:00:00.000Z',
            durationMinutes: 60,
            now: new Date('2026-04-20T09:30:00.000Z'),
            hasActiveAttempt: false,
        });

        expect(access).toMatchObject({
            state: 'before_start',
            reasonCode: 'NOT_STARTED',
            canStart: false,
            canResume: false,
            hasActiveAttempt: false,
        });
    });

    it('keeps locked exams resumable for students with active attempts', () => {
        const access = resolveExamRuntimeAccess({
            scheduledDate: '2026-04-20T10:00:00.000Z',
            endDateTime: '2026-04-20T11:00:00.000Z',
            durationMinutes: 60,
            now: new Date('2026-04-20T10:15:00.000Z'),
            hasActiveAttempt: true,
            reconnectAttemptCount: 1,
            maxReconnectAttempts: 3,
            persistedAccess: {
                state: 'locked',
                reopenedUntil: null,
            },
        });

        expect(access).toMatchObject({
            state: 'locked',
            reasonCode: 'LOCKED',
            canStart: false,
            canResume: true,
            hasActiveAttempt: true,
        });
    });

    it('allows reopened exams within the override window', () => {
        const access = resolveExamRuntimeAccess({
            scheduledDate: '2026-04-20T10:00:00.000Z',
            endDateTime: '2026-04-20T11:00:00.000Z',
            durationMinutes: 60,
            now: new Date('2026-04-20T11:10:00.000Z'),
            hasActiveAttempt: true,
            reconnectAttemptCount: 1,
            maxReconnectAttempts: 3,
            persistedAccess: {
                state: 'reopened',
                reopenedUntil: '2026-04-20T11:30:00.000Z',
            },
        });

        expect(access).toMatchObject({
            state: 'reopened',
            reasonCode: 'REOPENED',
            canStart: true,
            canResume: true,
            reopenedUntil: '2026-04-20T11:30:00.000Z',
        });
    });

    it('allows resumption for a reopened active attempt even when maxReconnectAttempts is 0 and reconnect attempts remaining is 0', () => {
        const access = resolveExamRuntimeAccess({
            scheduledDate: '2026-04-20T10:00:00.000Z',
            endDateTime: '2026-04-20T11:00:00.000Z',
            durationMinutes: 60,
            now: new Date('2026-04-20T11:10:00.000Z'),
            hasActiveAttempt: true,
            reconnectAttemptCount: 0,
            maxReconnectAttempts: 0,
            persistedAccess: {
                state: 'reopened',
                reopenedUntil: '2026-04-20T11:30:00.000Z',
            },
        });

        expect(access).toMatchObject({
            state: 'reopened',
            reasonCode: 'REOPENED',
            canStart: true,
            canResume: true,
            hasActiveAttempt: true,
            reopenedUntil: '2026-04-20T11:30:00.000Z',
        });
    });

    it('keeps active attempts resumable after the normal schedule cutoff', () => {
        const access = resolveExamRuntimeAccess({
            scheduledDate: '2026-04-20T10:00:00.000Z',
            endDateTime: '2026-04-20T11:00:00.000Z',
            durationMinutes: 60,
            now: new Date('2026-04-20T11:10:00.000Z'),
            hasActiveAttempt: true,
            reconnectAttemptCount: 1,
            maxReconnectAttempts: 3,
        });

        expect(access).toMatchObject({
            state: 'closed',
            reasonCode: 'CLOSED',
            canStart: false,
            canResume: true,
            hasActiveAttempt: true,
        });
    });

    it('allows start for an auto-admit open exam inside the schedule window', () => {
        // Phase 6: auto-admit enabled — AUTOMATIC mode exam inside schedule window
        // must resolve to open with canStart: true without any persisted override.
        const access = resolveExamRuntimeAccess({
            scheduledDate: '2026-04-20T10:00:00.000Z',
            endDateTime: '2026-04-20T11:00:00.000Z',
            durationMinutes: 60,
            now: new Date('2026-04-20T10:30:00.000Z'),
            hasActiveAttempt: false,
        });

        expect(access).toMatchObject({
            state: 'open',
            reasonCode: 'OPEN',
            canStart: true,
            canResume: false,
            hasActiveAttempt: false,
        });
    });
});
