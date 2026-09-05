import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import type { QuestionCardProps } from './inputs/question-card.types';
import {
    QuestionCardUnavailable,
    QuestionCardHeader,
    MultipleChoiceInput,
    MultipleResponseInput,
    TrueFalseInput,
    MatchingInput,
    FillBlankInput,
    EnumerationInput,
    EssayInput,
    normalizeQuestionType,
    resolveTextValue,
    resolveSelectedSingleId,
    resolveSelectedIds,
    resolveMatchingValues,
    resolveBlankValues,
} from './inputs';
import { PassageCard } from './passage-card';

export type { QuestionCardProps };

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
        return QuestionCardUnavailable({ colors });
    }

    const {
        type,
        text,
        options = [],
        pairs = [],
        blanks = [],
        passage,
        passageTitle,
        placeholder,
        maxLength,
    } = question;

    const points = typeof question.points === 'number' ? question.points : 1;
    const normalizedType = normalizeQuestionType(type);

    const selectedIds = resolveSelectedIds(selectedOptionId);
    const selectedSingleId = resolveSelectedSingleId(selectedOptionId);
    const currentTextValue = resolveTextValue(selectedOptionId);
    const matchingValues = resolveMatchingValues(selectedOptionId);
    const blankValues = resolveBlankValues(selectedOptionId);

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Question Header */}
            {QuestionCardHeader({
                currentIndex,
                totalQuestions,
                points,
                isFlagged,
                isDark,
                colors,
                onToggleFlag,
            })}

            {/* Reading Passage */}
            {passage ? <PassageCard passage={passage} title={passageTitle} /> : null}

            {/* Question Text */}
            <Text
                style={{ color: colors.text }}
                className="mb-6 text-lg font-semibold leading-relaxed"
            >
                {text || 'Question prompt unavailable.'}
            </Text>

            {/* ── Type-Specific Input Views ── */}
            {normalizedType === 'MULTIPLE_CHOICE' &&
                MultipleChoiceInput({
                    options,
                    selectedSingleId,
                    currentTextValue,
                    placeholder,
                    isDark,
                    colors,
                    onSelectOption,
                })}

            {normalizedType === 'MULTIPLE_RESPONSE' &&
                MultipleResponseInput({
                    options,
                    selectedIds,
                    currentTextValue,
                    placeholder,
                    isDark,
                    colors,
                    onSelectOption,
                })}

            {normalizedType === 'TRUE_FALSE' &&
                TrueFalseInput({
                    options,
                    selectedOptionId,
                    selectedSingleId,
                    isDark,
                    colors,
                    onSelectOption,
                })}

            {normalizedType === 'MATCHING' &&
                MatchingInput({
                    pairs,
                    matchingValues,
                    currentTextValue,
                    placeholder,
                    isDark,
                    colors,
                    onSelectOption,
                })}

            {normalizedType === 'FILL_BLANK' &&
                FillBlankInput({
                    blanks,
                    blankValues,
                    currentTextValue,
                    placeholder,
                    maxLength,
                    colors,
                    onSelectOption,
                })}

            {normalizedType === 'ENUMERATION' &&
                EnumerationInput({
                    blanks,
                    blankValues,
                    maxLength,
                    colors,
                    onSelectOption,
                })}

            {(normalizedType === 'ESSAY' ||
                normalizedType === 'IDENTIFICATION' ||
                !['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE', 'MATCHING', 'FILL_BLANK', 'ENUMERATION'].includes(normalizedType)) &&
                EssayInput({
                    normalizedType,
                    currentTextValue,
                    placeholder,
                    maxLength,
                    colors,
                    onSelectOption,
                })}
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
