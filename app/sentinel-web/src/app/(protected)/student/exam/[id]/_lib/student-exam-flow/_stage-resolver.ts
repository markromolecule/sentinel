import type {
    StudentExamStage,
    StudentExamStageResolverInput,
    StudentExamStageResolverResult,
} from './_types';
import { STUDENT_EXAM_STAGES } from './_types';
import { resolveStudentExamAdmissionState } from './_readiness';

/**
 * Pure stage resolver that calculates the exact single target stage for a student exam session.
 *
 * Stage precedence (highest to lowest priority):
 *   1. Turned-in / Completed  → result
 *   2. Lifecycle blocked       → instruction (with block banner)
 *   3. Unrecoverable errors    → instruction (fail closed)
 *   4. Privacy not accepted    → privacy (or instruction)
 *   5. Checkup / MediaPipe     → checkup (or earlier stages)
 *   6. Active attempt          → attempt (or lobby for session mismatch)
 *   7. Instructor-gated lobby  → lobby (pending/rejected/approved)
 *   8. Automatic admission     → lobby (must start session first)
 */
export function resolveStudentExamStage(
    input: StudentExamStageResolverInput,
): StudentExamStageResolverResult {
    const {
        requestedStage,
        privacyAccepted,
        checkupCompleted,
        mediaPipeStatus,
        admissionMode,
        admissionState: explicitAdmissionState,
        runtimeAccess,
        configQueryError,
        examQueryError,
    } = input;

    const admissionState =
        explicitAdmissionState ?? resolveStudentExamAdmissionState(runtimeAccess);

    // ── 1. Turned-in / Completed exam ────────────────────────────────────────
    const isOverrideActive = Boolean(runtimeAccess?.canStart || runtimeAccess?.canResume);
    if (runtimeAccess?.isTurnedIn && !isOverrideActive) {
        return {
            targetStage: 'result',
            reasonCode: 'TURNED_IN',
            shouldRedirect: requestedStage !== 'result',
        };
    }

    // ── 2. Lifecycle blocked state ────────────────────────────────────────────
    if (runtimeAccess?.blockedCode) {
        const reasonCode = `BLOCKED_${runtimeAccess.blockedCode}` as const;
        return {
            targetStage: 'instruction',
            reasonCode,
            shouldRedirect: requestedStage !== 'instruction',
        };
    }

    // ── 3. Unrecoverable configuration or exam query failure ──────────────────
    if (configQueryError && examQueryError) {
        return {
            targetStage: 'instruction',
            reasonCode: 'CONFIG_ERROR',
            shouldRedirect: requestedStage !== 'instruction',
        };
    }

    // ── 4. Preflight Stage 1: Privacy Consent ─────────────────────────────────
    if (!privacyAccepted) {
        if (
            requestedStage === 'checkup' ||
            requestedStage === 'lobby' ||
            requestedStage === 'attempt'
        ) {
            return {
                targetStage: 'privacy',
                reasonCode: 'PRIVACY_REQUIRED',
                shouldRedirect: true,
            };
        }
        const targetStage = requestedStage === 'privacy' ? 'privacy' : 'instruction';
        return {
            targetStage,
            reasonCode: requestedStage === 'privacy' ? 'PRIVACY_REQUIRED' : 'INSTRUCTION',
            shouldRedirect: false,
        };
    }

    // ── 5. Preflight Stage 2: System Checkup & MediaPipe Calibration ──────────
    const isMediaPipeValid = mediaPipeStatus === 'ready' || mediaPipeStatus === 'not-required';
    const isCheckupReady = checkupCompleted && isMediaPipeValid;

    if (!isCheckupReady) {
        if (requestedStage === 'lobby' || requestedStage === 'attempt') {
            return {
                targetStage: 'checkup',
                reasonCode: mediaPipeStatus === 'stale' ? 'MEDIAPIPE_STALE' : 'CHECKUP_REQUIRED',
                shouldRedirect: true,
            };
        }
        if (requestedStage === 'instruction') {
            return {
                targetStage: 'instruction',
                reasonCode: 'INSTRUCTION',
                shouldRedirect: false,
            };
        }
        if (requestedStage === 'privacy') {
            return {
                targetStage: 'privacy',
                reasonCode: 'PRIVACY_ACCEPTED',
                shouldRedirect: false,
            };
        }
        return {
            targetStage: 'checkup',
            reasonCode: mediaPipeStatus === 'stale' ? 'MEDIAPIPE_STALE' : 'CHECKUP_REQUIRED',
            shouldRedirect: false,
        };
    }

    // ── 6. Preflight Complete: Active Attempt or Reconnect Checks ─────────────
    const maxReconnect = runtimeAccess?.maxReconnectAttempts ?? 3;
    const reconnectCount = runtimeAccess?.reconnectCount ?? 0;
    const isAttemptActive = Boolean(
        runtimeAccess?.isAttemptActive ||
        (runtimeAccess as { hasActiveAttempt?: boolean })?.hasActiveAttempt ||
        runtimeAccess?.canResume,
    );

    if (isAttemptActive) {
        if (reconnectCount >= maxReconnect && !runtimeAccess?.canResume) {
            return {
                targetStage: 'lobby',
                reasonCode: 'MAX_RECONNECT_EXCEEDED',
                shouldRedirect: requestedStage !== 'lobby',
            };
        }

        const hasSessionMatchedEntry = Boolean(
            input.hasFreshLobbyEntry &&
            (!input.lobbyEntrySessionId ||
                !input.storedSessionId ||
                input.lobbyEntrySessionId === input.storedSessionId),
        );

        if (requestedStage === 'lobby') {
            return {
                targetStage: 'lobby',
                reasonCode: 'ATTEMPT_ACTIVE',
                shouldRedirect: false,
            };
        }

        if (requestedStage === 'attempt') {
            if (hasSessionMatchedEntry) {
                return {
                    targetStage: 'attempt',
                    reasonCode: 'ATTEMPT_ACTIVE',
                    shouldRedirect: false,
                };
            }
            return {
                targetStage: 'lobby',
                reasonCode: 'ATTEMPT_ACTIVE',
                shouldRedirect: true,
            };
        }

        const target = hasSessionMatchedEntry ? 'attempt' : 'lobby';
        return {
            targetStage: target,
            reasonCode: 'ATTEMPT_ACTIVE',
            shouldRedirect: requestedStage !== target,
        };
    }

    // ── 7. Preflight Complete: Lobby / Admission Gating ───────────────────────
    if (admissionMode === 'INSTRUCTOR_GATED') {
        if (admissionState === 'rejected') {
            return {
                targetStage: 'lobby',
                reasonCode: 'LOBBY_GATED_REJECTED',
                shouldRedirect: requestedStage !== 'lobby',
            };
        }
        if (admissionState === 'approved') {
            const targetStage =
                requestedStage === 'attempt' ? 'attempt' : (requestedStage as StudentExamStage);
            const validTarget = (STUDENT_EXAM_STAGES as readonly string[]).includes(targetStage)
                ? targetStage
                : 'lobby';
            return {
                targetStage: validTarget as StudentExamStage,
                reasonCode: 'LOBBY_GATED_APPROVED',
                shouldRedirect: requestedStage !== validTarget,
            };
        }
        return {
            targetStage: 'lobby',
            reasonCode: 'LOBBY_GATED_WAITING',
            shouldRedirect: requestedStage === 'attempt',
        };
    }

    // ── 8. Automatic Admission ─────────────────────────────────────────────────
    if (requestedStage === 'attempt' && !isAttemptActive) {
        return {
            targetStage: 'lobby',
            reasonCode: 'AUTOMATIC_ADMISSION',
            shouldRedirect: true,
        };
    }

    const validStage = (STUDENT_EXAM_STAGES as readonly string[]).includes(requestedStage)
        ? (requestedStage as StudentExamStage)
        : 'lobby';

    return {
        targetStage: validStage,
        reasonCode: 'AUTOMATIC_ADMISSION',
        shouldRedirect: false,
    };
}
