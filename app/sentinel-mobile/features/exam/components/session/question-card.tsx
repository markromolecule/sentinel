import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import type { MobileSessionQuestion } from '@/features/exam/lib/mobile-exam-adapter';
import { PassageCard } from './passage-card';

interface QuestionCardProps {
    question: MobileSessionQuestion | null | undefined;
    currentIndex: number;
    totalQuestions: number;
    /** Answer value for single-select, multi-select, array, object, or text. */
    selectedOptionId?: any;
    isFlagged: boolean;
    onSelectOption: (optionId: any) => void;
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

    if (!question) {
        return (
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.background,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 32,
                    },
                ]}
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

    const { type, text, options = [], pairs = [], blanks = [], passage, passageTitle, placeholder, maxLength } = question;
    const normalizedType = String(type || 'MULTIPLE_CHOICE').toUpperCase();

    const selectedIds: string[] = Array.isArray(selectedOptionId) ? selectedOptionId : [];
    const selectedSingleId = typeof selectedOptionId === 'string' ? selectedOptionId : undefined;

    // Derive current text value from prop for text-based questions (uncontrolled TextInput).
    const currentTextValue =
        typeof selectedOptionId === 'string'
            ? selectedOptionId
            : typeof selectedOptionId === 'number'
              ? String(selectedOptionId)
              : '';

    // Values map for MATCHING questions
    const matchingValues: Record<string, string> =
        typeof selectedOptionId === 'object' && selectedOptionId !== null && !Array.isArray(selectedOptionId)
            ? (selectedOptionId as Record<string, string>)
            : {};

    // Values list for FILL_BLANK and ENUMERATION questions
    const blankValues: string[] = Array.isArray(selectedOptionId)
        ? selectedOptionId.map((item) => String(item ?? ''))
        : [];

    const toggleMultiSelect = (optionId: string, optionText?: string) => {
        const matchesOption = (id: string) => id === optionId || (optionText && id === optionText);
        if (selectedIds.some(matchesOption)) {
            onSelectOption(selectedIds.filter((id) => !matchesOption(id)));
        } else {
            onSelectOption([...selectedIds, optionId]);
        }
    };

    const updateMatchingPair = (left: string, right: string) => {
        onSelectOption({
            ...matchingValues,
            [left]: right,
        });
    };

    const updateBlankValue = (index: number, value: string, totalCount: number) => {
        const next = [...blankValues];
        while (next.length < totalCount) {
            next.push('');
        }
        next[index] = value;
        onSelectOption(next);
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
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
                {text || 'Question prompt unavailable.'}
            </Text>

            {/* ── MULTIPLE_CHOICE ── */}
            {normalizedType === 'MULTIPLE_CHOICE' && (
                options.length > 0 ? (
                    <View>
                        {options.map((option) => {
                            const isSelected =
                                selectedSingleId === option.id || selectedSingleId === option.text;
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
                ) : (
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
                )
            )}

            {/* ── MULTIPLE_RESPONSE (multi-select checkboxes) ── */}
            {normalizedType === 'MULTIPLE_RESPONSE' && (
                options.length > 0 ? (
                    <View>
                        <Text
                            style={{ color: colors.icon }}
                            className="mb-3 text-xs font-semibold uppercase tracking-wide"
                        >
                            Select all that apply
                        </Text>
                        {options.map((option) => {
                            const isSelected =
                                selectedIds.includes(option.id) || selectedIds.includes(option.text);
                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    onPress={() => toggleMultiSelect(option.id, option.text)}
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
                ) : (
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
                )
            )}

            {/* ── TRUE_FALSE (toggle buttons) ── */}
            {normalizedType === 'TRUE_FALSE' && (
                <View className="flex-row gap-4">
                    {options.map((option) => {
                        const isSelected =
                            selectedSingleId === option.id ||
                            String(selectedSingleId).toLowerCase() === option.id.toLowerCase() ||
                            (selectedSingleId === 'true' && option.id === 'true') ||
                            (selectedSingleId === 'false' && option.id === 'false');
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

            {/* ── MATCHING ── */}
            {normalizedType === 'MATCHING' && (
                pairs.length > 0 ? (
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
                ) : (
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
                )
            )}

            {/* ── FILL_BLANK ── */}
            {normalizedType === 'FILL_BLANK' && (
                blanks.length > 1 ? (
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
                ) : (
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
                )
            )}

            {/* ── ENUMERATION ── */}
            {normalizedType === 'ENUMERATION' && (
                blanks.length > 1 ? (
                    <View className="gap-3">
                        {blanks.map((_, eIdx) => {
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
                                        onChangeText={(val) => updateBlankValue(eIdx, val, blanks.length)}
                                        placeholder={`Item ${eIdx + 1}…`}
                                        placeholderTextColor={colors.icon}
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
                ) : (
                    <View>
                        <TextInput
                            accessibilityLabel="Answer input"
                            defaultValue={currentTextValue}
                            onChangeText={(value) => onSelectOption(value)}
                            placeholder={placeholder ?? 'Enter your answer here…'}
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
                )
            )}

            {/* ── ESSAY / IDENTIFICATION ── */}
            {(normalizedType === 'ESSAY' || normalizedType === 'IDENTIFICATION') && (
                <View>
                    <TextInput
                        accessibilityLabel="Answer input"
                        defaultValue={currentTextValue}
                        onChangeText={(value) => onSelectOption(value)}
                        placeholder={placeholder ?? (normalizedType === 'ESSAY' ? 'Write your response here…' : 'Enter your answer here…')}
                        placeholderTextColor={colors.icon}
                        multiline={normalizedType === 'ESSAY'}
                        numberOfLines={normalizedType === 'ESSAY' ? 8 : 3}
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
                            textAlignVertical: normalizedType === 'ESSAY' ? 'top' : 'center',
                            minHeight: normalizedType === 'ESSAY' ? 160 : 52,
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
            )}

            {/* ── Fallback for any unmapped question types ── */}
            {!['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE', 'ESSAY', 'IDENTIFICATION', 'FILL_BLANK', 'ENUMERATION', 'MATCHING'].includes(normalizedType) && (
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
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 140,
        flexGrow: 1,
    },
});
