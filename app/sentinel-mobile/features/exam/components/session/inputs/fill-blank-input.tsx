import React from 'react';
import { View, Text, TextInput } from 'react-native';
import type { QuestionCardTheme } from './question-card.types';

export interface FillBlankInputProps {
    blanks: string[];
    blankValues: string[];
    currentTextValue: string;
    placeholder?: string;
    maxLength?: number;
    colors: QuestionCardTheme;
    onSelectOption: (optionId: any) => void;
}

export function FillBlankInput({
    blanks,
    blankValues,
    currentTextValue,
    placeholder,
    maxLength,
    colors,
    onSelectOption,
}: FillBlankInputProps) {
    const updateBlankValue = (index: number, value: string, totalCount: number) => {
        const next = [...blankValues];
        while (next.length < totalCount) {
            next.push('');
        }
        next[index] = value;
        onSelectOption(next);
    };

    if (blanks.length > 1) {
        return (
            <View className="gap-3">
                {blanks.map((_, bIdx) => {
                    const bVal = blankValues[bIdx] ?? '';
                    return (
                        <View key={`blank-${bIdx}`} className="gap-1">
                            <Text
                                style={{ color: colors.icon }}
                                className="text-xs font-bold uppercase tracking-wider"
                            >
                                Blank {bIdx + 1}
                            </Text>
                            <TextInput
                                accessibilityLabel={`Blank ${bIdx + 1}`}
                                defaultValue={bVal}
                                onChangeText={(val) => updateBlankValue(bIdx, val, blanks.length)}
                                placeholder={`Response for blank ${bIdx + 1}…`}
                                placeholderTextColor={colors.icon}
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: bVal ? colors.primary : colors.border,
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
                })}
            </View>
        );
    }

    return (
        <View>
            <TextInput
                accessibilityLabel="Answer input"
                defaultValue={currentTextValue}
                onChangeText={(value) => onSelectOption(value)}
                placeholder={placeholder ?? 'Fill in the blank…'}
                placeholderTextColor={colors.icon}
                maxLength={maxLength}
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
