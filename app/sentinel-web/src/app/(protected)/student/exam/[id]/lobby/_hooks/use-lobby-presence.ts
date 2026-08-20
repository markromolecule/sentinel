'use client';

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@sentinel/hooks';
import type { PresenceState } from '@sentinel/shared/types';

export function useLobbyPresence(examId: string) {
    const { supabase, session } = useAuth();
    const [presenceCount, setPresenceCount] = useState(0);
    const userId = session?.user?.id;

    useEffect(() => {
        let isEffectActive = true;

        if (!supabase || !userId || !examId) {
            setPresenceCount(0);
            return () => {
                isEffectActive = false;
            };
        }

        if (!supabase.channel || !supabase.removeChannel) {
            return () => {
                isEffectActive = false;
            };
        }

        const channelName = `presence:lobby:${examId}`;
        const channel: RealtimeChannel = supabase
            .channel(channelName, {
                config: {
                    presence: {
                        key: userId,
                    },
                },
            })
            .on('presence', { event: 'sync' }, () => {
                if (!isEffectActive) {
                    return;
                }

                const state = channel.presenceState<PresenceState>() ?? {};
                const uniqueUserIds = new Set<string>();

                Object.values(state).forEach((presences) => {
                    (presences ?? []).forEach((p) => {
                        if (p?.user_id) uniqueUserIds.add(p.user_id);
                    });
                });

                setPresenceCount(uniqueUserIds.size);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && isEffectActive) {
                    try {
                        await channel.track({
                            user_id: userId,
                            online_at: new Date().toISOString(),
                        });
                    } catch {
                        // ignore track errors if unmounted or channel closed
                    }
                }
            });

        return () => {
            isEffectActive = false;
            supabase.removeChannel(channel);
        };
    }, [supabase, userId, examId]);

    return { presenceCount };
}

