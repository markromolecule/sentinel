import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

interface PassageCardProps {
    /** Body text of the reading passage. */
    passage: string;
    /** Optional title for the passage block. Defaults to "Reading Passage". */
    title?: string | null;
}

/**
 * PassageCard renders a collapsible reading passage above a question prompt.
 * It is intended to be placed at the top of QuestionCard when a passage is
 * associated with the current question.
 */
export const PassageCard = ({ passage, title }: PassageCardProps) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const displayTitle = title?.trim() || 'Reading Passage';

    return (
        <View
            accessibilityRole={"article" as any}
            accessibilityLabel={`Reading passage: ${displayTitle}`}
            style={{
                backgroundColor: isDark ? '#1e2a3b' : '#f0f7ff',
                borderColor: isDark ? '#3b5a8a' : '#bfdbfe',
                borderWidth: 1,
                borderRadius: 12,
                marginBottom: 16,
                overflow: 'hidden',
            }}
        >
            {/* Header row — tap to expand/collapse */}
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isExpanded ? 'Collapse passage' : 'Expand passage'}
                accessibilityState={{ expanded: isExpanded }}
                onPress={() => setIsExpanded((prev) => !prev)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderBottomWidth: isExpanded ? 1 : 0,
                    borderBottomColor: isDark ? '#3b5a8a' : '#bfdbfe',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                        name="book-outline"
                        size={15}
                        color={isDark ? '#7ec8f9' : '#1d6fba'}
                    />
                    <Text
                        style={{
                            color: isDark ? '#7ec8f9' : '#1d6fba',
                            fontWeight: '700',
                            fontSize: 13,
                            letterSpacing: 0.4,
                            textTransform: 'uppercase',
                        }}
                    >
                        {displayTitle}
                    </Text>
                </View>

                <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={isDark ? '#7ec8f9' : '#1d6fba'}
                />
            </TouchableOpacity>

            {/* Passage body */}
            {isExpanded && (
                <ScrollView
                    style={{ maxHeight: 220 }}
                    contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12 }}
                    showsVerticalScrollIndicator
                    nestedScrollEnabled
                >
                    <Text
                        style={{
                            color: colors.text,
                            fontSize: 14,
                            lineHeight: 22,
                        }}
                    >
                        {passage}
                    </Text>
                </ScrollView>
            )}
        </View>
    );
};
