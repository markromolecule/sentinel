import { describe, expect, it } from 'vitest';
import type { ExamRuntimeAccess } from '@sentinel/shared/types';
import { resolveReconnectDisplay } from './index';

/**
 * Builds a minimal ExamRuntimeAccess stub for test purposes.
 */
function buildRuntimeAccess(overrides: Partial<ExamRuntimeAccess> = {}): ExamRuntimeAccess {
    return {
        state: 'open',
        reasonCode: 'OPEN',
        message: 'This exam is open for students.',
        canStart: true,
        canResume: false,
        hasActiveAttempt: false,
        startsAt: null,
        endsAt: null,
        reopenedUntil: null,
        reconnectAttemptsRemaining: 3,
        totalReconnectAttempts: 3,
        ...overrides,
    };
}

describe('resolveReconnectDisplay', () => {
    it('shows "1 used • 1 left" when student used 1 of 2 reconnect attempts', () => {
        const runtimeAccess = buildRuntimeAccess({
            totalReconnectAttempts: 2,
            reconnectAttemptsRemaining: 1,
        });

        const result = resolveReconnectDisplay(runtimeAccess, 2);

        expect(result.headerValue).toBe('1 used • 1 left');
        expect(result.statusMessage).toBe('Reconnect attempts used: 1 of 2. Remaining: 1.');
    });

    it('shows "0 used • 3 left" when no reconnects have been used', () => {
        const runtimeAccess = buildRuntimeAccess({
            totalReconnectAttempts: 3,
            reconnectAttemptsRemaining: 3,
        });

        const result = resolveReconnectDisplay(runtimeAccess, 3);

        expect(result.headerValue).toBe('0 used • 3 left');
        expect(result.statusMessage).toBe('Reconnect attempts used: 0 of 3. Remaining: 3.');
    });

    it('shows "2 used • 0 left" when all reconnects are exhausted', () => {
        const runtimeAccess = buildRuntimeAccess({
            totalReconnectAttempts: 2,
            reconnectAttemptsRemaining: 0,
        });

        const result = resolveReconnectDisplay(runtimeAccess, 2);

        expect(result.headerValue).toBe('2 used • 0 left');
        expect(result.statusMessage).toBe('Reconnect attempts used: 2 of 2. Remaining: 0.');
    });

    it('falls back to configuredTotal when runtimeAccess carries a transient 0/0 placeholder and configuredTotal is positive', () => {
        // This happens transiently right after check-in when the eligibility
        // service has not yet seen the updated attempt count from the DB.
        const runtimeAccess = buildRuntimeAccess({
            totalReconnectAttempts: 0,
            reconnectAttemptsRemaining: 0,
        });

        const result = resolveReconnectDisplay(runtimeAccess, 2);

        expect(result.headerValue).toBe('0 used • 2 left');
        expect(result.statusMessage).toBe('Reconnect attempts used: 0 of 2. Remaining: 2.');
    });

    it('shows strict proctor mode copy when configuredTotal is 0 and total is 0', () => {
        // If the exam truly has 0 reconnect attempts allowed, display strict proctor mode copy.
        const runtimeAccess = buildRuntimeAccess({
            totalReconnectAttempts: 0,
            reconnectAttemptsRemaining: 0,
        });

        const result = resolveReconnectDisplay(runtimeAccess, 0);

        expect(result.headerValue).toBe('Strict proctor mode • 0 reconnects');
        expect(result.statusMessage).toBe(
            'This exam does not permit unapproved reconnections. If you disconnect, instructor approval will be required to resume.',
        );
    });

    it('shows configuredTotal summary when runtimeAccess is null', () => {
        const result = resolveReconnectDisplay(null, 3);

        expect(result.headerValue).toBe('3 total attempts');
        expect(result.statusMessage).toBeNull();
    });

    it('shows configuredTotal summary when runtimeAccess is undefined', () => {
        const result = resolveReconnectDisplay(undefined, 2);

        expect(result.headerValue).toBe('2 total attempts');
        expect(result.statusMessage).toBeNull();
    });

    it('shows "Policy unavailable" when neither runtimeAccess nor configuredTotal is provided', () => {
        const result = resolveReconnectDisplay(undefined, undefined);

        expect(result.headerValue).toBe('Policy unavailable');
        expect(result.statusMessage).toBeNull();
    });

    it('shows "Policy unavailable" with a message when runtimeAccess is present but has no reconnect fields', () => {
        // runtimeAccess exists but reconnectAttemptsRemaining / totalReconnectAttempts are undefined
        const runtimeAccess = buildRuntimeAccess({
            reconnectAttemptsRemaining: undefined,
            totalReconnectAttempts: undefined,
        });

        const result = resolveReconnectDisplay(runtimeAccess, undefined);

        expect(result.headerValue).toBe('Policy unavailable');
        expect(result.statusMessage).toBe(
            'Total reconnect attempts allowed: unavailable for this session.',
        );
    });
});
