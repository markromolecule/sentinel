import type { ExamRuntimeAccess } from '@sentinel/shared/types';
import type { LobbyStateLabel } from '../_types';

export type LobbyReconnectDisplay = {
    headerValue: string;
    statusMessage: string | null;
};

export function formatLobbyCountdown(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}

/**
 * Resolves reconnect copy for lobby summary and status surfaces.
 *
 * Prefers live `runtimeAccess` values (`reconnectAttemptsRemaining` /
 * `totalReconnectAttempts`) when they are available and trustworthy.  A
 * "placeholder zero" situation arises when the server returns 0/0 for both
 * fields but the exam configuration carries a positive limit — this happens
 * transiently when the check-in has not yet propagated the attempt count back
 * to the eligibility service.  In that case the configured total is used so
 * the student never sees a misleading "0 left" display.
 *
 * @param runtimeAccess - Live runtime access object from the eligibility check.
 * @param configuredMaxReconnectAttempts - The exam's configured reconnect
 *   limit, sourced from `ExamConfig.maxReconnectAttempts`.
 * @returns An object with `headerValue` (short badge copy) and an optional
 *   `statusMessage` (longer sentence for the status info panel).
 */
export function resolveReconnectDisplay(
    runtimeAccess?: ExamRuntimeAccess | null,
    configuredMaxReconnectAttempts?: number | null,
): LobbyReconnectDisplay {
    const remaining = runtimeAccess?.reconnectAttemptsRemaining;
    const total = runtimeAccess?.totalReconnectAttempts;
    const configuredTotal = configuredMaxReconnectAttempts ?? null;

    if (typeof remaining === 'number' && typeof total === 'number') {
        // Treat a 0/0 runtime result as a placeholder when the exam config
        // carries a positive configured limit.  This can happen transiently
        // before the eligibility service has seen the updated attempt count.
        const isPlaceholderZeroPolicy =
            total === 0 &&
            remaining === 0 &&
            typeof configuredTotal === 'number' &&
            configuredTotal > 0;

        if (isPlaceholderZeroPolicy) {
            const fallbackTotal = configuredTotal;

            return {
                headerValue: `0 used • ${fallbackTotal} left`,
                statusMessage: `Reconnect attempts used: 0 of ${fallbackTotal}. Remaining: ${fallbackTotal}.`,
            };
        }

        if (total === 0 && (configuredTotal === 0 || configuredTotal === null)) {
            return {
                headerValue: 'Strict proctor mode • 0 reconnects',
                statusMessage:
                    'This exam does not permit unapproved reconnections. If you disconnect, instructor approval will be required to resume.',
            };
        }

        const used = Math.max(0, total - remaining);

        return {
            headerValue: `${used} used • ${remaining} left`,
            statusMessage: `Reconnect attempts used: ${used} of ${total}. Remaining: ${remaining}.`,
        };
    }

    if (configuredTotal === 0) {
        return {
            headerValue: 'Strict proctor mode • 0 reconnects',
            statusMessage:
                'This exam does not permit unapproved reconnections. If you disconnect, instructor approval will be required to resume.',
        };
    }

    if (typeof configuredTotal === 'number') {
        return {
            headerValue: `${configuredTotal} total attempts`,
            statusMessage: null,
        };
    }

    return {
        headerValue: 'Policy unavailable',
        statusMessage: runtimeAccess
            ? 'Total reconnect attempts allowed: unavailable for this session.'
            : null,
    };
}

export function getLobbyStateLabel(
    runtimeAccess?: ExamRuntimeAccess | null,
    hasCompletedFlow?: boolean,
): LobbyStateLabel {
    if (runtimeAccess?.canResume) {
        return 'Resume active attempt';
    }

    switch (runtimeAccess?.state) {
        case 'lobby_waiting':
            return runtimeAccess.reasonCode === 'LOBBY_REJECTED'
                ? 'Awaiting re-approval'
                : 'Waiting for approval';
        case 'lobby_approved':
            return 'Approved to continue';
        case 'before_start':
            return 'Read-only until start';
        case 'locked':
            return 'Locked by instructor';
        case 'reopened':
            return 'Reopened access';
        case 'closed':
            return 'Closed';
        case 'open':
        default:
            return hasCompletedFlow ? 'Ready for entry' : 'Pending checks';
    }
}
