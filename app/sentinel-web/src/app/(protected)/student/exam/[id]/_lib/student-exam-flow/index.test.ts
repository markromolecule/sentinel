import { describe, expect, it } from 'vitest';
import { resolveStudentExamAdmissionState, resolveStudentExamStage } from './index';
import type { StudentExamStageResolverInput } from './_types';

describe('resolveStudentExamStage', () => {
    it('redirects turned-in attempt to result stage', () => {
        const input: StudentExamStageResolverInput = {
            requestedStage: 'instruction',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
            runtimeAccess: {
                isTurnedIn: true,
            },
        };

        const result = resolveStudentExamStage(input);

        expect(result).toEqual({
            targetStage: 'result',
            reasonCode: 'TURNED_IN',
            shouldRedirect: true,
        });
    });

    it('redirects locked/closed/superseded lifecycle states to instruction', () => {
        const lockedInput: StudentExamStageResolverInput = {
            requestedStage: 'lobby',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
            runtimeAccess: {
                blockedCode: 'LOCKED',
            },
        };

        const result = resolveStudentExamStage(lockedInput);

        expect(result).toEqual({
            targetStage: 'instruction',
            reasonCode: 'BLOCKED_LOCKED',
            shouldRedirect: true,
        });
    });

    it('fails closed to instruction when query fails and no configuration is available', () => {
        const errorInput: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: null,
            admissionState: null,
            configQueryError: true,
            examQueryError: true,
        };

        const result = resolveStudentExamStage(errorInput);

        expect(result).toEqual({
            targetStage: 'instruction',
            reasonCode: 'CONFIG_ERROR',
            shouldRedirect: true,
        });
    });

    it('requires privacy consent when direct URL jumps to checkup, lobby, or attempt', () => {
        const directLobbyInput: StudentExamStageResolverInput = {
            requestedStage: 'lobby',
            privacyAccepted: false,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
        };

        const result = resolveStudentExamStage(directLobbyInput);

        expect(result).toEqual({
            targetStage: 'privacy',
            reasonCode: 'PRIVACY_REQUIRED',
            shouldRedirect: true,
        });
    });

    it('allows viewing instruction or privacy when consent is not yet granted', () => {
        const privacyInput: StudentExamStageResolverInput = {
            requestedStage: 'privacy',
            privacyAccepted: false,
            checkupCompleted: false,
            mediaPipeStatus: 'not-required',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
        };

        const result = resolveStudentExamStage(privacyInput);

        expect(result).toEqual({
            targetStage: 'privacy',
            reasonCode: 'PRIVACY_REQUIRED',
            shouldRedirect: false,
        });
    });

    it('redirects to checkup if checkup is incomplete when requesting lobby or attempt', () => {
        const input: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: false,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
        };

        const result = resolveStudentExamStage(input);

        expect(result).toEqual({
            targetStage: 'checkup',
            reasonCode: 'CHECKUP_REQUIRED',
            shouldRedirect: true,
        });
    });

    it('detects stale mediapipe calibration and redirects to checkup', () => {
        const input: StudentExamStageResolverInput = {
            requestedStage: 'lobby',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'stale',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
        };

        const result = resolveStudentExamStage(input);

        expect(result).toEqual({
            targetStage: 'checkup',
            reasonCode: 'MEDIAPIPE_STALE',
            shouldRedirect: true,
        });
    });

    it('handles instructor-gated waiting and rejection states', () => {
        const waitingInput: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'INSTRUCTOR_GATED',
            admissionState: 'pending',
        };

        expect(resolveStudentExamStage(waitingInput)).toEqual({
            targetStage: 'lobby',
            reasonCode: 'LOBBY_GATED_WAITING',
            shouldRedirect: true,
        });

        const rejectedInput: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'INSTRUCTOR_GATED',
            admissionState: 'rejected',
        };

        expect(resolveStudentExamStage(rejectedInput)).toEqual({
            targetStage: 'lobby',
            reasonCode: 'LOBBY_GATED_REJECTED',
            shouldRedirect: true,
        });
    });

    it('allows entry to attempt when instructor-gated is approved', () => {
        const approvedInput: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'INSTRUCTOR_GATED',
            admissionState: 'approved',
        };

        expect(resolveStudentExamStage(approvedInput)).toEqual({
            targetStage: 'attempt',
            reasonCode: 'LOBBY_GATED_APPROVED',
            shouldRedirect: false,
        });
    });

    it('gating active attempt: redirects to lobby from instruction/privacy without fresh entry', () => {
        const activeInput: StudentExamStageResolverInput = {
            requestedStage: 'instruction',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
            runtimeAccess: {
                isAttemptActive: true,
                reconnectCount: 1,
                maxReconnectAttempts: 3,
            },
            hasFreshLobbyEntry: false,
        };

        expect(resolveStudentExamStage(activeInput)).toEqual({
            targetStage: 'lobby',
            reasonCode: 'ATTEMPT_ACTIVE',
            shouldRedirect: true,
        });
    });

    it('gating active attempt: remains on lobby when lobby requested', () => {
        const activeInput: StudentExamStageResolverInput = {
            requestedStage: 'lobby',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
            runtimeAccess: {
                isAttemptActive: true,
                reconnectCount: 1,
                maxReconnectAttempts: 3,
            },
            hasFreshLobbyEntry: false,
        };

        expect(resolveStudentExamStage(activeInput)).toEqual({
            targetStage: 'lobby',
            reasonCode: 'ATTEMPT_ACTIVE',
            shouldRedirect: false,
        });
    });

    it('gating active attempt: redirects from attempt to lobby without fresh entry', () => {
        const activeInput: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
            runtimeAccess: {
                isAttemptActive: true,
                reconnectCount: 1,
                maxReconnectAttempts: 3,
            },
            hasFreshLobbyEntry: false,
        };

        expect(resolveStudentExamStage(activeInput)).toEqual({
            targetStage: 'lobby',
            reasonCode: 'ATTEMPT_ACTIVE',
            shouldRedirect: true,
        });
    });

    it('gating active attempt: remains on attempt with fresh session-matched entry', () => {
        const activeInput: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
            runtimeAccess: {
                isAttemptActive: true,
                reconnectCount: 1,
                maxReconnectAttempts: 3,
            },
            hasFreshLobbyEntry: true,
            storedSessionId: 'session-1',
            lobbyEntrySessionId: 'session-1',
        };

        expect(resolveStudentExamStage(activeInput)).toEqual({
            targetStage: 'attempt',
            reasonCode: 'ATTEMPT_ACTIVE',
            shouldRedirect: false,
        });
    });

    it('gating active attempt: redirects from attempt to lobby with mismatched session entry', () => {
        const activeInput: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
            runtimeAccess: {
                isAttemptActive: true,
                reconnectCount: 1,
                maxReconnectAttempts: 3,
            },
            hasFreshLobbyEntry: true,
            storedSessionId: 'session-1',
            lobbyEntrySessionId: 'session-2',
        };

        expect(resolveStudentExamStage(activeInput)).toEqual({
            targetStage: 'lobby',
            reasonCode: 'ATTEMPT_ACTIVE',
            shouldRedirect: true,
        });
    });

    it('blocks entry when max reconnect attempts are exceeded without resume override', () => {
        const maxReconnectInput: StudentExamStageResolverInput = {
            requestedStage: 'attempt',
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeStatus: 'ready',
            admissionMode: 'AUTOMATIC',
            admissionState: null,
            runtimeAccess: {
                isAttemptActive: true,
                reconnectCount: 3,
                maxReconnectAttempts: 3,
                canResume: false,
            },
        };

        expect(resolveStudentExamStage(maxReconnectInput)).toEqual({
            targetStage: 'lobby',
            reasonCode: 'MAX_RECONNECT_EXCEEDED',
            shouldRedirect: true,
        });
    });
});

describe('resolveStudentExamAdmissionState', () => {
    it('returns null when runtimeAccess is null or undefined', () => {
        expect(resolveStudentExamAdmissionState(null)).toBeNull();
        expect(resolveStudentExamAdmissionState(undefined)).toBeNull();
    });

    it('resolves lobby_approved state correctly', () => {
        expect(
            resolveStudentExamAdmissionState({
                state: 'lobby_approved',
                reasonCode: 'LOBBY_APPROVED',
                message: '',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
            }),
        ).toBe('approved');
    });

    it('resolves lobby_rejected or LOBBY_REJECTED reasonCode correctly', () => {
        expect(
            resolveStudentExamAdmissionState({
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_REJECTED',
                message: '',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
            }),
        ).toBe('rejected');
    });

    it('resolves lobby_waiting state correctly', () => {
        expect(
            resolveStudentExamAdmissionState({
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_WAITING',
                message: '',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
            }),
        ).toBe('pending');
    });

    it('supports legacy admissionStatus property when present', () => {
        expect(resolveStudentExamAdmissionState({ admissionStatus: 'APPROVED' })).toBe('approved');
        expect(resolveStudentExamAdmissionState({ admissionStatus: 'REJECTED' })).toBe('rejected');
        expect(resolveStudentExamAdmissionState({ admissionStatus: 'WAITING' })).toBe('pending');
    });
});
