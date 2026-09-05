import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QuestionCardTheme } from './question-card.types';

export interface QuestionCardUnavailableProps {
    colors: QuestionCardTheme;
}

export function QuestionCardUnavailable({ colors }: QuestionCardUnavailableProps) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
            }}
            accessibilityRole="alert"
            accessibilityLabel="Question unavailable"
        >
            <Ionicons name="alert-circle-outline" size={48} color={colors.icon} />
            <Text
                style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: '600',
                    marginTop: 12,
                    textAlign: 'center',
                }}
            >
                Question Unavailable
            </Text>
            <Text
                style={{
                    color: colors.icon,
                    fontSize: 14,
                    marginTop: 6,
                    textAlign: 'center',
                    lineHeight: 20,
                }}
            >
                Question details could not be loaded. Please try navigating to another question.
            </Text>
        </View>
    );
}
