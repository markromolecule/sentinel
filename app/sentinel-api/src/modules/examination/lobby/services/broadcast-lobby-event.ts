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
 * Dispatches a lightweight, stateless Supabase Realtime broadcast message over HTTP REST.
 *
 * Uses POST /realtime/v1/api/broadcast instead of maintaining ephemeral WebSocket
 * client lifecycles in Node.js, completely preventing socket teardown crashes.
 * Non-blocking with strict 2-second timeout and suppressed errors.
 */
export async function broadcastLobbyEvent(
    examId: string,
    event: LobbyBroadcastEvent,
    payload: LobbyBroadcastPayload,
): Promise<void> {
    try {
        const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            return;
        }

        const broadcastUrl = `${url.replace(/\/$/, '')}/realtime/v1/api/broadcast`;
        const channelTopic = `lobby:${examId}`;
        const phoenixTopic = `realtime:${channelTopic}`;

        const response = await fetch(broadcastUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: key,
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        topic: phoenixTopic,
                        event,
                        payload,
                    },
                    {
                        topic: channelTopic,
                        event,
                        payload,
                    },
                ],
            }),
            signal: AbortSignal.timeout(2000),
        });

        if (!response.ok) {
            console.warn(
                `[broadcastLobbyEvent] Realtime broadcast returned status ${response.status} for exam ${examId}`,
            );
        }
    } catch (err) {
        console.warn(`[broadcastLobbyEvent] Failed to broadcast ${event} for exam ${examId}:`, err);
    }
}
