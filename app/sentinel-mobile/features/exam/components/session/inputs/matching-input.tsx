import React from 'react';
import { View, Text, TextInput } from 'react-native';
import type { QuestionCardTheme } from './question-card.types';

export interface MatchingPair {
    left: string;
    right: string;
}

export interface MatchingInputProps {
    pairs: MatchingPair[];
    matchingValues: Record<string, string>;
    currentTextValue: string;
    placeholder?: string;
    isDark: boolean;
    colors: QuestionCardTheme;
    onSelectOption: (optionId: any) => void;
}

export function MatchingInput({
    pairs,
    matchingValues,
    currentTextValue,
    placeholder,
    isDark,
    colors,
    onSelectOption,
}: MatchingInputProps) {
    const updateMatchingPair = (left: string, right: string) => {
        onSelectOption({
            ...matchingValues,
            [left]: right,
        });
    };

    if (pairs.length === 0) {
        return (
            <View>
                <TextInput
                    accessibilityLabel="Answer input"
                    defaultValue={currentTextValue}
                    onChangeText={(value) => onSelectOption(value)}
                    placeholder={placeholder ?? 'Match the items on the left with those on the right.'}
                    placeholderTextColor={colors.icon}
                    style={{
                        backgroundColor: colors.card,
                        borderColor: currentTextValue ? colors.primary : colors.border,
                        borderWidth: 1.5,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        color: colors.text,
                        fontSize: 15,
                        minHeight: 52,
                    }}
                />
            </View>
        );
    }

    return (
        <View className="gap-4">
            {pairs.map((pair, pIdx) => {
                const pairVal = matchingValues[pair.left] ?? '';
                return (
                    <View
                        key={`pair-${pIdx}`}
                        style={{
                            backgroundColor: colors.card,
                            borderRadius: 14,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text
                            style={{ color: colors.icon }}
                            className="mb-1 text-xs font-bold uppercase tracking-wider"
                        >
                            Prompt
                        </Text>
                        <Text
                            style={{ color: colors.text }}
                            className="mb-3 text-base font-semibold"
                        >
                            {pair.left}
                        </Text>
                        <TextInput
                            accessibilityLabel={`Match for ${pair.left}`}
                            defaultValue={pairVal}
                            onChangeText={(val) => updateMatchingPair(pair.left, val)}
                            placeholder={placeholder ?? 'Type the matching value…'}
                            placeholderTextColor={colors.icon}
                            style={{
                                backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                                borderColor: pairVal ? colors.primary : colors.border,
                                borderWidth: 1.5,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                color: colors.text,
                                fontSize: 14,
                            }}
                        />
                    </View>
                );
            })}
        </View>
    );
}
