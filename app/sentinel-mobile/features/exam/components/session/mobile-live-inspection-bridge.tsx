import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi, useAuth } from '@sentinel/hooks';
import {
    getStudentLiveInspectionDirective,
    createLiveInspectionPublisherConnection,
    acknowledgeLiveInspectionPublisherReady,
    acknowledgeLiveInspectionPublisherFailure,
} from '@sentinel/services';
import type { LiveInspectionDirective } from '@sentinel/shared/schema';
import { Colors } from '@/constants/theme';
import type { MobileMediaPipeBridgeRef } from '../checkup/mobile-mediapipe-bridge';

export type MobileLiveInspectionBridgeProps = {
    sessionId: string | null;
    attemptId?: string | null;
    enabled: boolean;
    mediaPipeRef?: React.RefObject<MobileMediaPipeBridgeRef | null>;
    getLiveVideoTrack?: () => any;
};

/**
 * MobileLiveInspectionBridge connects the mobile exam camera stream to the proctoring network
 * via LiveKit embedded in the MediaPipe WebView, displaying a subtle overlay indicator when being viewed live.
 */
export function MobileLiveInspectionBridge({
    sessionId,
    attemptId: _attemptId,
    enabled,
    mediaPipeRef,
}: MobileLiveInspectionBridgeProps) {
    const apiClient = useApi();
    const { supabase } = useAuth();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const [isLive, setIsLive] = useState(false);
    const activeLeaseIdRef = useRef<string | null>(null);

    const stopPublication = useCallback(async () => {
        if (!activeLeaseIdRef.current) return;
        activeLeaseIdRef.current = null;
        setIsLive(false);
        try {
            await mediaPipeRef?.current?.stopLiveInspection();
        } catch (e) {
            console.warn('Failed to stop LiveKit inspection stream:', e);
        }
    }, [mediaPipeRef]);

    const reconcileDirective = useCallback(async () => {
        if (!enabled || !sessionId) {
            return;
        }

        try {
            const directive: LiveInspectionDirective = await getStudentLiveInspectionDirective(apiClient, {
                sessionId,
            });

            const isPublishState =
                directive.state === 'REQUESTED' ||
                directive.state === 'PUBLISHER_CONNECTING' ||
                directive.state === 'PUBLISHER_READY' ||
                directive.state === 'LIVE';

            const isStopState =
                directive.state === 'STOPPING' ||
                directive.state === 'ENDED' ||
                directive.state === 'FAILED' ||
                directive.state === 'EXPIRED';

            if (isPublishState) {
                if (activeLeaseIdRef.current === directive.leaseId && isLive) {
                    return; // Already publishing for this lease
                }

                activeLeaseIdRef.current = directive.leaseId;

                let connection = directive.connection;
                if (!connection) {
                    connection = await createLiveInspectionPublisherConnection(apiClient, {
                        sessionId,
                        leaseId: directive.leaseId,
                        revision: directive.revision,
                    });
                }

                if (connection?.liveKitUrl && connection?.token) {
                    await mediaPipeRef?.current?.startLiveInspection({
                        liveKitUrl: connection.liveKitUrl,
                        token: connection.token,
                    });

                    await acknowledgeLiveInspectionPublisherReady(apiClient, {
                        sessionId,
                        leaseId: directive.leaseId,
                        revision: directive.revision,
                    });

                    setIsLive(true);
                }
            } else if (isStopState) {
                await stopPublication();
            }
        } catch (err: any) {
            const status = err?.status ?? err?.statusCode;
            const isNotFoundError =
                status === 404 ||
                err?.message?.includes('Live inspection is not available') ||
                err?.message?.includes('not found');

            if (!isNotFoundError) {
                console.warn('Live inspection directive reconciliation failed:', err);
            }

            if (activeLeaseIdRef.current) {
                try {
                    await acknowledgeLiveInspectionPublisherFailure(apiClient, {
                        sessionId,
                        leaseId: activeLeaseIdRef.current,
                        revision: 1,
                        errorCode: 'LIVEKIT_CONNECT_FAILED',
                    });
                } catch { }
            }
            await stopPublication();
        }
    }, [apiClient, enabled, mediaPipeRef, sessionId, stopPublication]);

    useEffect(() => {
        if (!enabled || !sessionId) {
            void stopPublication();
            return;
        }

        // Initial directive check
        void reconcileDirective();

        // Subscribe to Supabase realtime events on exam_sessions channel
        const channel = supabase
            ?.channel?.(`exam_sessions:${sessionId}`)
            ?.on('broadcast', { event: 'LIVE_INSPECTION_CHANGED' }, () => {
                void reconcileDirective();
            })
            ?.subscribe?.();

        const pollInterval = setInterval(() => {
            void reconcileDirective();
        }, 10000);

        return () => {
            clearInterval(pollInterval);
            if (channel && supabase?.removeChannel) {
                void supabase.removeChannel(channel);
            }
            void stopPublication();
        };
    }, [enabled, reconcileDirective, sessionId, stopPublication, supabase]);

    if (!isLive) {
        return null;
    }

    return (
        <View
            accessibilityLabel="Live inspection indicator"
            accessibilityRole="alert"
            style={{
                position: 'absolute',
                top: 50,
                left: 20,
                right: 20,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 10,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
                zIndex: 999,
            }}
        >
            <Ionicons name="eye" size={16} color="#10b981" style={{ marginRight: 8 }} />
            <Text
                style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.text,
                    textAlign: 'center',
                }}
            >
                Camera being viewed live by authorized proctor
            </Text>
        </View>
    );
}
