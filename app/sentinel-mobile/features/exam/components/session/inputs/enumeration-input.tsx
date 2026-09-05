import React from 'react';
import { View, Text, TextInput } from 'react-native';
import type { QuestionCardTheme } from './question-card.types';

export interface EnumerationInputProps {
    blanks: string[];
    blankValues: string[];
    maxLength?: number;
    colors: QuestionCardTheme;
    onSelectOption: (optionId: any) => void;
}

export function EnumerationInput({
    blanks,
    blankValues,
    maxLength,
    colors,
    onSelectOption,
}: EnumerationInputProps) {
    const enumCount = blanks.length > 0 ? blanks.length : 3;
    const enumItems = Array.from({ length: enumCount });

    const updateBlankValue = (index: number, value: string, totalCount: number) => {
        const next = [...blankValues];
        while (next.length < totalCount) {
            next.push('');
        }
        next[index] = value;
        onSelectOption(next);
    };

    return (
        <View className="gap-3">
            {enumItems.map((_, eIdx) => {
                const eVal = blankValues[eIdx] ?? '';
                return (
                    <View key={`enum-${eIdx}`} className="gap-1">
                        <Text
                            style={{ color: colors.icon }}
                            className="text-xs font-bold uppercase tracking-wider"
                        >
                            Item {eIdx + 1}
                        </Text>
                        <TextInput
                            accessibilityLabel={`Item ${eIdx + 1}`}
                            defaultValue={eVal}
                            onChangeText={(val) => updateBlankValue(eIdx, val, enumCount)}
                            placeholder={`Item ${eIdx + 1}…`}
                            placeholderTextColor={colors.icon}
                            maxLength={maxLength}
                            style={{
                                backgroundColor: colors.card,
                                borderColor: eVal ? colors.primary : colors.border,
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
