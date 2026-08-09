import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { getPasswordRequirements } from '../lib/password-requirements-validator';

interface PasswordRequirementsProps {
    value: string;
    isVisible?: boolean;
}

/**
 * A UI component that displays a checklist of password requirements
 * and highlights met requirements in green.
 *
 * @param value The password string to evaluate.
 * @param isVisible Whether the checklist should be visible.
 */
export function PasswordRequirements({ value = '', isVisible = false }: PasswordRequirementsProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    if (!isVisible) return null;

    const requirements = getPasswordRequirements(value);

    return (
        <View className="mt-2 flex-row flex-wrap gap-y-2 px-1">
            {requirements.map((req, index) => {
                const iconName = req.met ? 'checkmark-circle' : 'ellipse-outline';
                const textColor = req.met
                    ? (isDark ? '#4ADE80' : '#22C55E')
                    : (isDark ? 'rgba(255,255,255,0.4)' : '#64748B');
                const iconColor = req.met
                    ? (isDark ? '#4ADE80' : '#22C55E')
                    : (isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1');

                return (
                    <View key={index} className="w-[50%] flex-row items-center gap-1.5 py-0.5">
                        <Ionicons name={iconName} size={14} color={iconColor} />
                        <Text
                            style={{ color: textColor }}
                            className="text-xs font-medium"
                        >
                            {req.text}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}
