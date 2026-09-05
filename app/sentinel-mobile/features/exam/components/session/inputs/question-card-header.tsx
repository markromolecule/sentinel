import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QuestionCardTheme } from './question-card.types';

export interface QuestionCardHeaderProps {
    currentIndex: number;
    totalQuestions: number;
    points: number;
    isFlagged: boolean;
    isDark: boolean;
    colors: QuestionCardTheme;
    onToggleFlag: () => void;
}

export function QuestionCardHeader({
    currentIndex,
    totalQuestions,
    points,
    isFlagged,
    isDark,
    colors,
    onToggleFlag,
}: QuestionCardHeaderProps) {
    return (
        <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
                <Text
                    style={{ color: colors.icon }}
                    className="text-sm font-bold uppercase tracking-wider"
                >
                    Question {currentIndex + 1} of {totalQuestions}
                </Text>
                <View
                    style={{
                        backgroundColor: isDark ? '#374151' : '#f3f4f6',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                    }}
                >
                    <Text
                        style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}
                    >
                        {points} {points === 1 ? 'pt' : 'pts'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={onToggleFlag}
                accessibilityRole="button"
                accessibilityLabel={isFlagged ? 'Unflag question' : 'Flag question for review'}
                className="flex-row items-center gap-1 opacity-80"
            >
                <Ionicons
                    name={isFlagged ? 'flag' : 'flag-outline'}
                    size={16}
                    color={isFlagged ? '#f59e0b' : colors.icon}
                />
                <Text
                    style={{ color: isFlagged ? '#f59e0b' : colors.icon }}
                    className="text-xs font-medium"
                >
                    {isFlagged ? 'Flagged' : 'Flag for Review'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
