import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export default function StudentExamFeedbackThankYouScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const handleReturnToDashboard = () => {
        router.replace('/(tabs)/exam');
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 24,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
            }}
        >
            <View
                style={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    borderRadius: 28,
                    paddingHorizontal: 28,
                    paddingVertical: 36,
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: 400,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: isDark ? 0.3 : 0.08,
                    shadowRadius: 20,
                    elevation: 5,
                }}
            >
                {/* Icon Container */}
                <View
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: 24,
                        backgroundColor: '#10b98118',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 20,
                    }}
                >
                    <Ionicons name="checkmark-circle" size={44} color="#10b981" />
                </View>

                {/* Title */}
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 22,
                        fontWeight: '700',
                        textAlign: 'center',
                        marginBottom: 10,
                    }}
                >
                    Thank you for the feedback
                </Text>

                {/* Description */}
                <Text
                    style={{
                        color: colors.icon,
                        fontSize: 14,
                        textAlign: 'center',
                        lineHeight: 22,
                        marginBottom: 28,
                    }}
                >
                    Your response has been recorded and will help improve the exam experience for future attempts.
                </Text>

                {/* Action Button */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleReturnToDashboard}
                    style={{
                        backgroundColor: colors.text,
                        borderRadius: 16,
                        height: 50,
                        width: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons
                        name="home-outline"
                        size={18}
                        color={colors.background}
                        style={{ marginRight: 8 }}
                    />
                    <Text
                        style={{
                            color: colors.background,
                            fontSize: 16,
                            fontWeight: '600',
                        }}
                    >
                        Return to Dashboard
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
