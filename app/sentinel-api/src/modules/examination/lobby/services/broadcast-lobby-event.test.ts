import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { broadcastLobbyEvent } from './broadcast-lobby-event';

describe('broadcastLobbyEvent', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    it('gracefully returns if Supabase credentials are not configured', async () => {
        delete process.env.SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

        const fetchSpy = vi.spyOn(globalThis, 'fetch');

        await expect(
            broadcastLobbyEvent('exam-1', 'admission:updated', {
                examId: 'exam-1',
                studentIds: ['student-1'],
                status: 'APPROVED',
            }),
        ).resolves.toBeUndefined();

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sends broadcast message via REST API with correct headers and body', async () => {
        process.env.SUPABASE_URL = 'https://mock.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({}),
        } as any);

        await broadcastLobbyEvent('exam-1', 'admission:updated', {
            examId: 'exam-1',
            studentIds: ['student-1'],
            status: 'APPROVED',
        });

        expect(fetchSpy).toHaveBeenCalledWith(
            'https://mock.supabase.co/realtime/v1/api/broadcast',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: 'mock-service-role-key',
                    Authorization: 'Bearer mock-service-role-key',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            topic: 'lobby:exam-1',
                            event: 'admission:updated',
                            payload: {
                                examId: 'exam-1',
                                studentIds: ['student-1'],
                                status: 'APPROVED',
                            },
                        },
                    ],
                }),
            }),
        );
    });

    it('gracefully handles non-200 responses without throwing', async () => {
        process.env.SUPABASE_URL = 'https://mock.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 500,
        } as any);

        await expect(
            broadcastLobbyEvent('exam-1', 'student:checked_in', {
                examId: 'exam-1',
                studentId: 'student-1',
            }),
        ).resolves.toBeUndefined();
    });

    it('gracefully suppresses fetch network errors and abort timeouts', async () => {
        process.env.SUPABASE_URL = 'https://mock.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

        vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network connection timeout'));

        await expect(
            broadcastLobbyEvent('exam-1', 'student:checked_in', {
                examId: 'exam-1',
                studentId: 'student-1',
            }),
        ).resolves.toBeUndefined();
    });
});
