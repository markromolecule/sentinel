import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, useColorScheme, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '@/constants/theme';
import { PasswordRequirements } from './password-requirements';

interface PasswordInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    error?: string;
    showRequirements?: boolean;
}

export const PasswordInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    showRequirements = false,
}: PasswordInputProps) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const [isVisible, setIsVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            <Text
                style={[
                    styles.label,
                    { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
                ]}
            >
                {label}
            </Text>

            <View
                style={[
                    styles.inputWrapper,
                    {
                        backgroundColor: isFocused
                            ? isDark
                                ? 'rgba(255,255,255,0.04)'
                                : '#fff'
                            : isDark
                                ? 'rgba(255,255,255,0.02)'
                                : '#F8FAFC',
                        borderColor: isFocused
                            ? colors.primary
                            : isDark
                                ? 'rgba(255,255,255,0.08)'
                                : '#E2E8F0',
                        borderWidth: isFocused ? 2 : 1,
                    },
                ]}
            >
                <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : '#94A3B8'}
                    secureTextEntry={!isVisible}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />

                <TouchableOpacity
                    onPress={() => setIsVisible(!isVisible)}
                    style={styles.toggleBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                >
                    <Ionicons
                        name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={isFocused ? colors.primary : '#94A3B8'}
                    />
                </TouchableOpacity>
            </View>

            {showRequirements && (
                <PasswordRequirements value={value} isVisible={isFocused} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
        marginLeft: 4,
    },
    inputWrapper: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 50,
    },
    input: {
        height: '100%',
        flex: 1,
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
    },
    toggleBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
    },
});
