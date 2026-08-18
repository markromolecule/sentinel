import { describe, expect, it } from 'vitest';
import {
    resolveLobbyRuntimeAccess,
    type ResolveLobbyRuntimeAccessArgs,
} from './resolve-lobby-runtime-access';

const baseScheduledRuntimeAccess = {
    state: 'open',
    reasonCode: 'OPEN',
    message: 'This exam is open for students.',
    canStart: true,
    canResume: false,
    hasActiveAttempt: false,
    startsAt: null,
    endsAt: null,
    reopenedUntil: null,
} satisfies ResolveLobbyRuntimeAccessArgs['scheduledRuntimeAccess'];

describe('resolveLobbyRuntimeAccess', () => {
    it('preserves resume access for an approved student with an active attempt', () => {
        const result = resolveLobbyRuntimeAccess({
            scheduledRuntimeAccess: {
                ...baseScheduledRuntimeAccess,
                state: 'locked',
                reasonCode: 'LOCKED',
                message: 'This exam is locked to new joins, but can be resumed.',
                canStart: false,
                canResume: true,
                hasActiveAttempt: true,
            },
            admissionStatus: 'APPROVED',
        });

        expect(result).toMatchObject({
            state: 'lobby_approved',
            reasonCode: 'LOBBY_APPROVED',
            canStart: false,
            canResume: true,
            hasActiveAttempt: true,
        });
    });

    it('allows an approved student without an active attempt to start even when scheduled start is false', () => {
        const result = resolveLobbyRuntimeAccess({
            scheduledRuntimeAccess: {
                ...baseScheduledRuntimeAccess,
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
            },
            admissionStatus: 'APPROVED',
        });

        expect(result).toMatchObject({
            state: 'lobby_approved',
            reasonCode: 'LOBBY_APPROVED',
            canStart: true,
            canResume: false,
            hasActiveAttempt: false,
        });
    });
});
