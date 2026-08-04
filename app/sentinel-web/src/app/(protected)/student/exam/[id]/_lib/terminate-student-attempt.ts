import {
    clearStoredExamAnswerDraft,
    clearStoredExamSession,
    clearStoredLobbyEntry,
    clearStoredReconnectIntent,
} from './exam-session-storage';
import { clearStoredExamTurnInPreview } from './exam-turn-in-storage';

export type TerminateStudentAttemptArgs = {
    examId: string;
};

/**
 * Clears all client-side attempt state after the server reports a terminal attempt.
 *
 * The helper is intentionally safe to call more than once. Storage removals are
 * idempotent, which lets independent teardown paths converge on the same state.
 */
export function terminateStudentAttempt({ examId }: TerminateStudentAttemptArgs) {
    clearStoredExamSession(examId);
    clearStoredExamAnswerDraft(examId);
    clearStoredExamTurnInPreview(examId);
    clearStoredLobbyEntry(examId);
    clearStoredReconnectIntent(examId);
}
