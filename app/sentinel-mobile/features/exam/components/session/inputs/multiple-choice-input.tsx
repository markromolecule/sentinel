import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import type { QuestionCardTheme } from './question-card.types';
import { getOptionLetter } from './question-card.utils';

export interface MultipleChoiceOption {
    id: string;
    text: string;
}

export interface MultipleChoiceInputProps {
    options: MultipleChoiceOption[];
    selectedSingleId?: string;
    currentTextValue: string;
    placeholder?: string;
    isDark: boolean;
    colors: QuestionCardTheme;
    onSelectOption: (optionId: string) => void;
}

export function MultipleChoiceInput({
    options,
    selectedSingleId,
    currentTextValue,
    placeholder,
    isDark,
    colors,
    onSelectOption,
}: MultipleChoiceInputProps) {
    if (options.length === 0) {
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

    return (
        <View>
            {options.map((option, optIdx) => {
                const isSelected =
                    selectedSingleId === option.id || selectedSingleId === option.text;
                const optionLetter = getOptionLetter(option.id, optIdx);
                return (
                    <TouchableOpacity
                        key={option.id}
                        onPress={() => onSelectOption(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={option.text}
                        style={{
                            backgroundColor: isSelected
                                ? isDark
                                    ? '#312e81'
                                    : '#eef2ff'
                                : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderWidth: isSelected ? 2 : 1,
                        }}
                        className="mb-4 flex-row items-center gap-3 rounded-2xl p-4"
                    >
                        <View
                            style={{
                                borderColor: isSelected ? colors.primary : colors.icon,
                                backgroundColor: isSelected
                                    ? colors.primary
                                    : 'transparent',
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1.5,
                            }}
                        />
                        <View
                            style={{
                                backgroundColor: isSelected
                                    ? isDark ? '#3730a3' : '#e0e7ff'
                                    : isDark ? '#374151' : '#f3f4f6',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                            }}
                        >
                            <Text
                                style={{
                                    color: isSelected
                                        ? isDark ? '#c7d2fe' : '#4338ca'
                                        : colors.text,
                                    fontWeight: '700',
                                    fontSize: 13,
                                }}
                            >
                                {optionLetter}
                            </Text>
                        </View>
                        <Text
                            style={{ color: colors.text }}
                            className="flex-1 text-base font-medium leading-relaxed"
                        >
                            {option.text}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
