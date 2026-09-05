import React, { useEffect } from 'react';
import {
    View,
    Text,
    Platform,
    Dimensions,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { ThemeColors } from '@/types/exam';
import { isQuestionAnswered } from '@/features/exam/lib/mobile-exam-adapter';

interface QuestionDrawerProps {
    visible: boolean;
    onClose: () => void;
    questions: any[];
    currentIndex: number;
    onSelectQuestion: (index: number) => void;
    answers: Record<string, any>;
    flaggedQuestions: Record<string, boolean>;
    colors: ThemeColors;
    isDark: boolean;
    bottomOffset: number;
}

export const QuestionDrawer = ({
    visible,
    onClose,
    questions,
    currentIndex,
    onSelectQuestion,
    answers,
    flaggedQuestions,
    colors,
    isDark,
    bottomOffset,
}: QuestionDrawerProps) => {
    const { height: screenHeight } = Dimensions.get('window');
    const translateY = useSharedValue(screenHeight); // Start off-screen

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.quad),
            });
        } else {
            translateY.value = withTiming(screenHeight, {
                duration: 300,
                easing: Easing.in(Easing.quad),
            });
        }
    }, [visible, screenHeight]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.drawerContainer,
                {
                    bottom: bottomOffset,
                    backgroundColor: colors.background,
                },
                animatedStyle,
            ]}
        >
            <View className="w-full">
                    {/* Header */}
                    <View
                        style={{ borderBottomColor: colors.border }}
                        className="w-full flex-row items-center justify-between border-b p-4"
                    >
                        <Text style={{ color: colors.text }} className="text-lg font-bold">
                            Question Navigator
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
                        >
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Horizontal Scroll List */}
                    <View className="mb-4 h-24 w-full py-4">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 16,
                                gap: 12,
                                alignItems: 'center',
                            }}

                        >
                            {questions.map((q, index) => {
                                const isCurrent = index === currentIndex;
                                const isAnswered = isQuestionAnswered(answers[q.id]);
                                const isFlagged = !!flaggedQuestions[q.id];

                                let bgColor = colors.input;
                                let borderColor = 'transparent';
                                let textColor = colors.text;

                                if (isCurrent) {
                                    borderColor = colors.primary;
                                    bgColor = isDark ? '#1a1b2e' : '#eef2ff';
                                    textColor = colors.primary;
                                } else if (isAnswered) {
                                    bgColor = isDark ? '#064e3b' : '#ecfdf5';
                                    textColor = isDark ? '#34d399' : '#059669';
                                }

                                if (isFlagged) {
                                    borderColor = '#f59e0b';
                                }

                                return (
                                    <TouchableOpacity
                                        key={q.id}
                                        onPress={() => {
                                            onSelectQuestion(index);
                                            onClose();
                                        }}
                                        style={{
                                            backgroundColor: bgColor,
                                            borderColor: borderColor,
                                            borderWidth: 2,
                                            width: 50,
                                            height: 50,
                                        }}
                                        className="relative items-center justify-center rounded-xl"
                                    >
                                        <Text
                                            style={{ color: textColor }}
                                            className={`text-base font-semibold ${isCurrent ? 'font-bold' : ''}`}
                                        >
                                            {index + 1}
                                        </Text>

                                        {isFlagged && (
                                            <View className="absolute -right-1 -top-1 rounded-full border border-white bg-amber-100 p-0.5 dark:border-black dark:bg-amber-900">
                                                <Ionicons name="flag" size={10} color="#f59e0b" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Legend */}
                    <View
                        style={{ borderTopColor: colors.border, backgroundColor: colors.card }}
                        className="border-t p-4"
                    >
                        <View className="flex-row justify-between pb-4">
                            <View className="mr-2 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                                <View
                                    className="h-2.5 w-2.5 rounded-full border-2"
                                    style={{ borderColor: colors.primary }}
                                />
                                <Text
                                    style={{ color: colors.text }}
                                    className="text-xs font-medium"
                                >
                                    Current
                                </Text>
                            </View>
                            <View className="mr-2 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
                                <View className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                <Text
                                    style={{ color: colors.text }}
                                    className="text-xs font-medium"
                                >
                                    Answered
                                </Text>
                            </View>
                            <View className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
                                <Ionicons name="flag" size={10} color="#f59e0b" />
                                <Text
                                    style={{ color: colors.text }}
                                    className="text-xs font-medium"
                                >
                                    Flagged
                                </Text>
                            </View>
                        </View>
                    </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    drawerContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 20,
        overflow: 'hidden',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
});

