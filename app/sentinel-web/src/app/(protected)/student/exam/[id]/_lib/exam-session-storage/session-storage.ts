import type { StartExamSessionResult } from '@sentinel/services';
import { buildExamSessionStorageKey, buildExamAnswerDraftStorageKey } from './constants';
import type { StoredExamSession } from './types';

export function readStoredExamSession(examId: string): StoredExamSession | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const rawValue = window.sessionStorage.getItem(buildExamSessionStorageKey(examId));

    if (!rawValue) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue) as unknown;

        if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
            window.sessionStorage.removeItem(buildExamSessionStorageKey(examId));
            return null;
        }

        const record = parsedValue as Record<string, unknown>;

        if (typeof record.examId !== 'string' || typeof record.sessionId !== 'string') {
            window.sessionStorage.removeItem(buildExamSessionStorageKey(examId));
            return null;
        }

        return record as unknown as StoredExamSession;
    } catch {
        window.sessionStorage.removeItem(buildExamSessionStorageKey(examId));
        return null;
    }
}

export function writeStoredExamSession(
    examId: string,
    session: StartExamSessionResult,
): StoredExamSession | null {
    if (typeof window === 'undefined' || !session.sessionId) {
        return null;
    }

    const storedSession: StoredExamSession = {
        examId,
        sessionId: session.sessionId,
        attemptId: session.attemptId,
        configSnapshot: session.configSnapshot,
        isResumed: session.isResumed,
        storedAt: new Date().toISOString(),
    };

    window.sessionStorage.setItem(
        buildExamSessionStorageKey(examId),
        JSON.stringify(storedSession),
    );

    return storedSession;
}

export function clearStoredExamSession(examId: string) {
    if (typeof window === 'undefined') {
        return;
    }

    const sessionKey = buildExamSessionStorageKey(examId);
    const lockKey = `${sessionKey}:lock`;

    window.sessionStorage.removeItem(sessionKey);
    window.sessionStorage.removeItem(lockKey);
    window.localStorage?.removeItem(buildExamAnswerDraftStorageKey(examId));
}
