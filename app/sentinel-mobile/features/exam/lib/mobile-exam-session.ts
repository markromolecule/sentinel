import type { Exam } from '@/data/exams';

type MobileExamSessionConfigSnapshot = {
    settings: Exam['settings'];
    configuration: Exam['configuration'];
};

export type MobileExamSessionResult = {
    sessionId: string;
    configSnapshot: MobileExamSessionConfigSnapshot;
    isResumed?: boolean;
    mode: 'remote' | 'mock';
};

function createPseudoUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const randomValue = Math.floor(Math.random() * 16);
        const normalizedValue = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;

        return normalizedValue.toString(16);
    });
}

function createMockExamSession(exam: Exam): MobileExamSessionResult {
    return {
        sessionId: createPseudoUuid(),
        configSnapshot: {
            settings: exam.settings,
            configuration: exam.configuration,
        },
        isResumed: false,
        mode: 'mock',
    };
}

export async function startMobileExamSession(exam: Exam): Promise<MobileExamSessionResult> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
    const bearerToken = process.env.EXPO_PUBLIC_API_BEARER_TOKEN?.trim();

    if (!apiBaseUrl) {
        return createMockExamSession(exam);
    }

    try {
        const response = await fetch(`${apiBaseUrl}/examination/flow/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
            },
            body: JSON.stringify({
                examId: exam.id,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to start mobile exam session: ${response.status}`);
        }

        const payload = (await response.json()) as {
            data?: {
                sessionId?: string;
                configSnapshot?: MobileExamSessionConfigSnapshot;
                isResumed?: boolean;
            };
        };

        if (!payload.data?.sessionId || !payload.data.configSnapshot) {
            throw new Error('Mobile exam session response did not include a session snapshot.');
        }

        return {
            sessionId: payload.data.sessionId,
            configSnapshot: payload.data.configSnapshot,
            isResumed: payload.data.isResumed,
            mode: 'remote',
        };
    } catch (error) {
        console.warn('Falling back to a mock mobile exam session.', error);
        return createMockExamSession(exam);
    }
}
