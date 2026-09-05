import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { QuestionCardTheme } from './question-card.types';

export interface TrueFalseOption {
    id: string;
    text: string;
}

export interface TrueFalseInputProps {
    options: TrueFalseOption[];
    selectedOptionId?: any;
    selectedSingleId?: string;
    isDark: boolean;
    colors: QuestionCardTheme;
    onSelectOption: (optionId: string) => void;
}

export function TrueFalseInput({
    options,
    selectedOptionId,
    selectedSingleId,
    isDark,
    colors,
    onSelectOption,
}: TrueFalseInputProps) {
    return (
        <View className="flex-row gap-4">
            {options.map((option) => {
                const optionKey = String(option.id).toLowerCase();
                const isSelected =
                    (selectedOptionId === true && optionKey === 'true') ||
                    (selectedOptionId === false && optionKey === 'false') ||
                    selectedSingleId?.toLowerCase() === optionKey ||
                    String(selectedOptionId).toLowerCase() === optionKey;
                const accent = optionKey === 'true' ? '#10b981' : '#ef4444';
                return (
                    <TouchableOpacity
                        key={option.id}
                        onPress={() => onSelectOption(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={option.text}
                        style={{
                            flex: 1,
                            borderRadius: 14,
                            paddingVertical: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected
                                ? accent
                                : isDark
                                    ? '#1f2937'
                                    : '#f9fafb',
                            borderWidth: 2,
                            borderColor: isSelected ? accent : colors.border,
                        }}
                    >
                        <Text
                            style={{
                                color: isSelected ? '#fff' : colors.text,
                                fontWeight: '700',
                                fontSize: 16,
                            }}
                        >
                            {option.text}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
