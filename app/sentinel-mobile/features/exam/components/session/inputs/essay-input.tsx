import React from 'react';
import { View, Text, TextInput } from 'react-native';
import type { QuestionCardTheme } from './question-card.types';

export interface EssayInputProps {
    normalizedType: string;
    currentTextValue: string;
    placeholder?: string;
    maxLength?: number;
    colors: QuestionCardTheme;
    onSelectOption: (value: string) => void;
}

export function EssayInput({
    normalizedType,
    currentTextValue,
    placeholder,
    maxLength,
    colors,
    onSelectOption,
}: EssayInputProps) {
    const isEssay = normalizedType === 'ESSAY';
    const isIdentification = normalizedType === 'IDENTIFICATION';

    if (isEssay || isIdentification) {
        const defaultPlaceholder = isEssay
            ? 'Write your response here…'
            : 'Enter your answer here…';
        return (
            <View>
                <TextInput
                    accessibilityLabel="Answer input"
                    defaultValue={currentTextValue}
                    onChangeText={(value) => onSelectOption(value)}
                    placeholder={placeholder ?? defaultPlaceholder}
                    placeholderTextColor={colors.icon}
                    multiline={isEssay}
                    numberOfLines={isEssay ? 8 : 3}
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
                        lineHeight: 22,
                        textAlignVertical: isEssay ? 'top' : 'center',
                        minHeight: isEssay ? 160 : 52,
                    }}
                />
                {Boolean(maxLength) && (
                    <Text
                        style={{ color: colors.icon }}
                        className="mt-1 self-end text-xs"
                    >
                        {currentTextValue.length} / {maxLength}
                    </Text>
                )}
            </View>
        );
    }

    // Generic fallback for unmapped question types
    return (
        <View>
            <TextInput
                accessibilityLabel="Answer input"
                defaultValue={currentTextValue}
                onChangeText={(value) => onSelectOption(value)}
                placeholder={placeholder ?? 'Enter your answer here…'}
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
