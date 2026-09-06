import { useMemo, useState } from 'react';

export type AttemptBlockedState = {
    isBlocked: boolean;
    code: string | null;
    title: string | null;
    message: string | null;
};

/**
 * Manages local blocked state messages (e.g. from 409 terminal responses)
 * and merges them with initial stage-guard blocked state.
 */
export function useAttemptBlockedState(initialBlockedState?: AttemptBlockedState | null) {
    const [localBlockedMessage, setLocalBlockedMessage] = useState<string | null>(null);
    const [terminalAttemptSuspended, setTerminalAttemptSuspended] = useState(false);

    const effectiveBlockedState = useMemo<AttemptBlockedState>(() => {
        if (localBlockedMessage) {
            const isSuperseded = /reset|replaced|superseded/i.test(localBlockedMessage);
            return {
                isBlocked: true,
                code: isSuperseded ? 'SUPERSEDED' : 'LOCKED',
                title: isSuperseded ? 'Attempt Replaced' : 'Exam Locked',
                message: localBlockedMessage,
            };
        }

        return (
            initialBlockedState ?? {
                isBlocked: false,
                code: null,
                title: null,
                message: null,
            }
        );
    }, [initialBlockedState, localBlockedMessage]);

    return {
        localBlockedMessage,
        setLocalBlockedMessage,
        terminalAttemptSuspended,
        setTerminalAttemptSuspended,
        effectiveBlockedState,
    };
}
