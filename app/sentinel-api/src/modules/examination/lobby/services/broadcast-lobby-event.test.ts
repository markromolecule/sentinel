import { describe, expect, it, vi } from 'vitest';
import { broadcastLobbyEvent } from './broadcast-lobby-event';
import * as supabaseAdminModule from '../../../../lib/supabase-admin';

describe('broadcastLobbyEvent', () => {
    it('gracefully returns if Supabase admin is not configured', async () => {
        vi.spyOn(supabaseAdminModule, 'getSupabaseAdmin').mockReturnValue(null);

        await expect(
            broadcastLobbyEvent('exam-1', 'admission:updated', {
                examId: 'exam-1',
                studentIds: ['student-1'],
                status: 'APPROVED',
            }),
        ).resolves.toBeUndefined();
    });

    it('sends broadcast message on subscribed channel and cleans up', async () => {
        const mockSend = vi.fn().mockResolvedValue({});
        const mockChannel = {
            subscribe: vi.fn((callback: (status: string) => void) => {
                callback('SUBSCRIBED');
                return mockChannel;
            }),
            send: mockSend,
        };
        const mockRemoveChannel = vi.fn().mockResolvedValue({});
        const mockSupabase = {
            channel: vi.fn().mockReturnValue(mockChannel),
            removeChannel: mockRemoveChannel,
        } as any;

        vi.spyOn(supabaseAdminModule, 'getSupabaseAdmin').mockReturnValue(mockSupabase);

        await broadcastLobbyEvent('exam-1', 'admission:updated', {
            examId: 'exam-1',
            studentIds: ['student-1'],
            status: 'APPROVED',
        });

        expect(mockSupabase.channel).toHaveBeenCalledWith('lobby:admissions:exam-1');
        expect(mockSend).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'admission:updated',
            payload: {
                examId: 'exam-1',
                studentIds: ['student-1'],
                status: 'APPROVED',
            },
        });
        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('cleans up channel on channel error or timeout', async () => {
        const mockRemoveChannel = vi.fn().mockResolvedValue({});
        const mockChannel = {
            subscribe: vi.fn((callback: (status: string) => void) => {
                callback('CHANNEL_ERROR');
                return mockChannel;
            }),
            send: vi.fn(),
        };
        const mockSupabase = {
            channel: vi.fn().mockReturnValue(mockChannel),
            removeChannel: mockRemoveChannel,
        } as any;

        vi.spyOn(supabaseAdminModule, 'getSupabaseAdmin').mockReturnValue(mockSupabase);

        await broadcastLobbyEvent('exam-1', 'student:checked_in', {
            examId: 'exam-1',
            studentId: 'student-1',
        });

        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });
});
