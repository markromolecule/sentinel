import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi, useAuth, useStudentLiveInspectionPublisher } from '@sentinel/hooks';
import { Colors } from '@/constants/theme';

export type MobileLiveInspectionBridgeProps = {
    sessionId: string | null;
    attemptId: string | null;
    enabled: boolean;
    getLiveVideoTrack: () => any;
};

/**
 * MobileLiveInspectionBridge connects the mobile exam camera stream to the proctoring network
 * via LiveKit, displaying a subtle overlay indicator when being viewed live.
 */
export function MobileLiveInspectionBridge({
    sessionId,
    attemptId,
    enabled,
    getLiveVideoTrack,
}: MobileLiveInspectionBridgeProps) {
    const apiClient = useApi();
    const { supabase } = useAuth();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const publisher = useStudentLiveInspectionPublisher({
        supabase,
        apiClient,
        sessionId,
        attemptId,
        enabled,
        getLiveVideoTrack,
    });

    if (!publisher?.isLive) {
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
