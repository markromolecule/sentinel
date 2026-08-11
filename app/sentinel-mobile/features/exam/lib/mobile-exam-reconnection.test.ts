import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MobileExamReconnection } from './mobile-exam-reconnection';
import { writeStoredMobileExamSession } from './mobile-exam-storage';
import { Alert, AppState } from 'react-native';

vi.mock('react-native', () => {
    return {
        AppState: {
            addEventListener: vi.fn(() => ({ remove: vi.fn() })),
        },
        Alert: {
            alert: vi.fn(),
        },
    };
});

vi.mock('./mobile-exam-storage', () => ({
    writeStoredMobileExamSession: vi.fn(),
}));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('MobileExamReconnection', () => {
    let mockRouter: any;
    let config: any;
    let globalFetch: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRouter = { replace: vi.fn() };
        config = {
            examId: 'exam-123',
            sessionId: 'session-456',
            onReconnectionFailed: vi.fn(),
        };
        globalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = globalFetch;
        vi.restoreAllMocks();
    });

    it('should start listening to AppState changes', () => {
        const recon = new MobileExamReconnection(config, mockRouter);
        recon.startListening();
        expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should retry reconnection up to 3 times on network failure', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

        // Use baseDelay = 1ms for fast test execution with real timers
        const recon = new MobileExamReconnection(config, mockRouter, 1);
        recon.triggerNetworkDisruption();

        // 1st retry: after 1ms * 2^0 = 1ms
        // 2nd retry: after 1ms * 2^1 = 2ms
        // 3rd retry: after 1ms * 2^2 = 4ms
        // Total delay is around 7ms plus microtask ticks. We wait 50ms to be safe.
        await delay(100);

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(writeStoredMobileExamSession).toHaveBeenCalledWith({
            examId: 'exam-123',
            sessionId: 'session-456',
            isResumed: true,
        });
        expect(Alert.alert).toHaveBeenCalled();
    });

    it('should recover if a fetch request succeeds', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 204,
        });

        const recon = new MobileExamReconnection(config, mockRouter, 1);
        recon.triggerNetworkDisruption();

        await delay(50);
        expect(fetch).toHaveBeenCalledTimes(1);

        // No more retries should be scheduled
        await delay(100);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(Alert.alert).not.toHaveBeenCalled();
    });
});
