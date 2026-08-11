import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import type { MobileSessionQuestion } from '@/features/exam/lib/mobile-exam-adapter';
import { PassageCard } from './passage-card';

interface QuestionCardProps {
    question: MobileSessionQuestion | null | undefined;
    currentIndex: number;
    totalQuestions: number;
    /** For single-select types this is a string option ID; for multi-select it is an array. */
    selectedOptionId?: string | string[];
    isFlagged: boolean;
    onSelectOption: (optionId: string | string[]) => void;
    onToggleFlag: () => void;
}

/**
 * QuestionCard renders a single exam question with type-specific input UI.
 * Supports MULTIPLE_CHOICE, MULTIPLE_RESPONSE, TRUE_FALSE, IDENTIFICATION,
 * ESSAY, FILL_BLANK, ENUMERATION, and MATCHING question types.
 * Displays an optional reading passage (PassageCard) above the prompt when present.
 */
export const QuestionCard = ({
    question,
    currentIndex,
    totalQuestions,
    selectedOptionId,
    isFlagged,
    onSelectOption,
    onToggleFlag,
}: QuestionCardProps) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[colorScheme ?? 'light'];

    if (!question) return null;

    const { type, text, options, passage, passageTitle, placeholder, maxLength } = question;

    const selectedIds: string[] = Array.isArray(selectedOptionId) ? selectedOptionId : [];
    const selectedSingleId = typeof selectedOptionId === 'string' ? selectedOptionId : undefined;

    // Derive current text value from prop for text-based questions (uncontrolled TextInput).
    const currentTextValue =
        typeof selectedOptionId === 'string' && options.length === 0 ? selectedOptionId : '';

    const toggleMultiSelect = (optionId: string) => {
        if (selectedIds.includes(optionId)) {
            onSelectOption(selectedIds.filter((id) => id !== optionId));
        } else {
            onSelectOption([...selectedIds, optionId]);
        }
    };

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            {/* Question Header */}
            <View className="mb-4 flex-row items-center justify-between">
                <Text
                    style={{ color: colors.icon }}
                    className="text-sm font-bold uppercase tracking-wider"
                >
                    Question {currentIndex + 1} of {totalQuestions}
                </Text>
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

            {/* Reading Passage */}
            {passage ? <PassageCard passage={passage} title={passageTitle} /> : null}

            {/* Question Text */}
            <Text
                style={{ color: colors.text }}
                className="mb-6 text-lg font-semibold leading-relaxed"
            >
                {text}
            </Text>

            {/* ── MULTIPLE_CHOICE ── */}
            {type === 'MULTIPLE_CHOICE' && (
                <View>
                    {options.map((option) => {
                        const isSelected = selectedSingleId === option.id;
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
                                className="mb-4 flex-row items-center gap-4 rounded-2xl p-4"
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
                                <Text
                                    style={{ color: colors.text }}
                                    className="ml-2 flex-1 text-base font-medium leading-relaxed"
                                >
                                    {option.text}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* ── MULTIPLE_RESPONSE (multi-select checkboxes) ── */}
            {type === 'MULTIPLE_RESPONSE' && (
                <View>
                    <Text
                        style={{ color: colors.icon }}
                        className="mb-3 text-xs font-semibold uppercase tracking-wide"
                    >
                        Select all that apply
                    </Text>
                    {options.map((option) => {
                        const isSelected = selectedIds.includes(option.id);
                        return (
                            <TouchableOpacity
                                key={option.id}
                                onPress={() => toggleMultiSelect(option.id)}
                                accessibilityRole="checkbox"
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
                                className="mb-4 flex-row items-center gap-4 rounded-2xl p-4"
                            >
                                <View
                                    style={{
                                        borderColor: isSelected ? colors.primary : colors.icon,
                                        backgroundColor: isSelected
                                            ? colors.primary
                                            : 'transparent',
                                        width: 24,
                                        height: 24,
                                        borderRadius: 6,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 1.5,
                                    }}
                                />
                                <Text
                                    style={{ color: colors.text }}
                                    className="ml-2 flex-1 text-base font-medium leading-relaxed"
                                >
                                    {option.text}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* ── TRUE_FALSE (toggle buttons) ── */}
            {type === 'TRUE_FALSE' && (
                <View className="flex-row gap-4">
                    {options.map((option) => {
                        const isSelected = selectedSingleId === option.id;
                        const accent = option.id === 'true' ? '#10b981' : '#ef4444';
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
            )}

            {/* ── ESSAY / IDENTIFICATION / FILL_BLANK / ENUMERATION ── */}
            {(type === 'ESSAY' ||
                type === 'IDENTIFICATION' ||
                type === 'FILL_BLANK' ||
                type === 'ENUMERATION') && (
                <View>
                    <TextInput
                        accessibilityLabel="Answer input"
                        defaultValue={currentTextValue}
                        onChangeText={(value) => onSelectOption(value)}
                        placeholder={placeholder ?? 'Enter your answer here…'}
                        placeholderTextColor={colors.icon}
                        multiline={type === 'ESSAY'}
                        numberOfLines={type === 'ESSAY' ? 8 : 3}
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
                            textAlignVertical: type === 'ESSAY' ? 'top' : 'center',
                            minHeight: type === 'ESSAY' ? 160 : 52,
                        }}
                    />
                    {maxLength && (
                        <Text
                            style={{ color: colors.icon }}
                            className="mt-1 self-end text-xs"
                        >
                            {currentTextValue.length} / {maxLength}
                        </Text>
                    )}
                </View>
            )}

            {/* ── MATCHING (display-only notice) ── */}
            {type === 'MATCHING' && (
                <View
                    style={{
                        backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <Text style={{ color: colors.icon, fontSize: 14 }}>
                        {placeholder ?? 'Match the items on the left with those on the right.'}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};
