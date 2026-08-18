import { RuntimeAccessService } from '../../runtime-access/runtime-access.service';
import type { LobbyAdmissionStatus } from '../../lobby/lobby.dto';

export type ResolveLobbyRuntimeAccessArgs = {
    scheduledRuntimeAccess: Awaited<
        ReturnType<typeof RuntimeAccessService.resolveExamRuntimeAccess>
    >;
    admissionStatus: LobbyAdmissionStatus | null;
};

/**
 * Resolves the final runtime access state for instructor-gated lobbies.
 * Overrides the base scheduled access permissions depending on admission status.
 */
export function resolveLobbyRuntimeAccess({
    scheduledRuntimeAccess,
    admissionStatus,
}: ResolveLobbyRuntimeAccessArgs) {
    if (admissionStatus === 'APPROVED') {
        return {
            ...scheduledRuntimeAccess,
            state: 'lobby_approved' as const,
            reasonCode: 'LOBBY_APPROVED' as const,
            message: 'Instructor approval received. You may now continue to the exam attempt.',
            canStart: Boolean(
                scheduledRuntimeAccess.canStart || !scheduledRuntimeAccess.hasActiveAttempt,
            ),
            canResume: Boolean(scheduledRuntimeAccess.canResume),
        };
    }

    if (admissionStatus === 'REJECTED') {
        return {
            ...scheduledRuntimeAccess,
            state: 'lobby_waiting' as const,
            reasonCode: 'LOBBY_REJECTED' as const,
            message:
                'Your lobby request is not approved yet. Stay in the lobby and wait for the instructor to admit you.',
            canStart: false,
            canResume: false,
        };
    }

    return {
        ...scheduledRuntimeAccess,
        state: 'lobby_waiting' as const,
        reasonCode: 'LOBBY_WAITING' as const,
        message:
            'This exam requires instructor approval before you can enter the attempt. Stay in the lobby while waiting.',
        canStart: false,
        canResume: false,
    };
}
