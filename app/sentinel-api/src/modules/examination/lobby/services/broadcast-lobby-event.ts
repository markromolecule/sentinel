import { getSupabaseAdmin } from '../../../../lib/supabase-admin';

export type LobbyBroadcastPayload = {
    examId: string;
    studentIds?: string[];
    studentId?: string;
    status?: string;
    decidedAt?: string | null;
    checkedInAt?: string | null;
    [key: string]: any;
};

export type LobbyBroadcastEvent = 'admission:updated' | 'student:checked_in';

/**
 * Safely dispatches a Supabase Realtime broadcast message on the exam lobby channel.
 * Non-blocking / fire-and-forget; handles missing credentials and socket timeouts gracefully.
 */
export async function broadcastLobbyEvent(
    examId: string,
    event: LobbyBroadcastEvent,
    payload: LobbyBroadcastPayload,
): Promise<void> {
    try {
        const supabase = getSupabaseAdmin();
        if (!supabase || typeof supabase.channel !== 'function') {
            return;
        }

        const channelName = `lobby:admissions:${examId}`;
        const channel = supabase.channel(channelName);

        await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
                try {
                    void supabase.removeChannel(channel);
                } catch {
                    // Ignore removal errors on timeout
                }
                resolve();
            }, 3000);

            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    void channel
                        .send({
                            type: 'broadcast',
                            event,
                            payload,
                        })
                        .finally(() => {
                            clearTimeout(timeoutId);
                            try {
                                void supabase.removeChannel(channel);
                            } catch {
                                // Ignore cleanup errors
                            }
                            resolve();
                        });
                } else if (
                    status === 'CHANNEL_ERROR' ||
                    status === 'TIMED_OUT' ||
                    status === 'CLOSED'
                ) {
                    clearTimeout(timeoutId);
                    try {
                        void supabase.removeChannel(channel);
                    } catch {
                        // Ignore cleanup errors
                    }
                    resolve();
                }
            });
        });
    } catch (err) {
        console.warn(`[broadcastLobbyEvent] Failed to broadcast ${event} for exam ${examId}:`, err);
    }
}
