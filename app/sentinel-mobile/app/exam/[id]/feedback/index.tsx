import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useCreateFeedbackMutation, useExamQuery } from '@sentinel/hooks';
import { adaptExamForMobile } from '@/features/exam/lib/mobile-exam-adapter';

const RATING_OPTIONS = [
    { value: '1', label: 'Bad', emoji: '😔', description: 'Difficult end to end.' },
    { value: '2', label: 'Poor', emoji: '😕', description: 'Several parts got in the way.' },
    { value: '3', label: 'Fair', emoji: '😐', description: 'Usable, with some rough spots.' },
    { value: '4', label: 'Good', emoji: '🙂', description: 'Mostly smooth with minor friction.' },
    { value: '5', label: 'Excellent', emoji: '❤️', description: 'Smooth, clear, and dependable.' },
] as const;

export default function StudentExamFeedbackScreen() {
    const router = useRouter();
    const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const { data: rawExam } = useExamQuery(id);
    const exam = rawExam ? adaptExamForMobile(rawExam) : undefined;

    const [rating, setRating] = useState<string>('');
    const [experience, setExperience] = useState<string>('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const selectedRatingOption = useMemo(
        () => RATING_OPTIONS.find((option) => option.value === rating) ?? null,
        [rating],
    );

    const createFeedbackMutation = useCreateFeedbackMutation({
        onSuccess: () => {
            router.replace({
                pathname: '/exam/[id]/feedback/thank-you',
                params: { id, attemptId: attemptId ?? '' },
            });
        },
        onError: (error) => {
            if (error.message.toLowerCase().includes('already been submitted')) {
                router.replace({
                    pathname: '/exam/[id]/feedback/thank-you',
                    params: { id, attemptId: attemptId ?? '' },
                });
                return;
            }
            Alert.alert('Submission Error', error.message || 'Failed to submit feedback.');
        },
    });

    const handleSubmit = () => {
        if (!attemptId) {
            setValidationError('Attempt information is missing. Returning to exam dashboard.');
            Alert.alert('Missing Attempt', 'Attempt details were not found.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/exam') },
            ]);
            return;
        }

        if (!rating) {
            setValidationError('Please select a rating before submitting your feedback.');
            return;
        }

        setValidationError(null);
        createFeedbackMutation.mutate({
            attemptId,
            rating: Number(rating),
            experience: experience.trim() ? experience.trim() : null,
        });
    };

    const handleSkip = () => {
        router.replace('/(tabs)/exam');
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={{
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 24,
                    paddingHorizontal: 20,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header Badge */}
                <View
                    style={{
                        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <View
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            backgroundColor: colors.primary + '18',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                        }}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}
                            numberOfLines={1}
                        >
                            {exam?.title ?? 'Post-exam experience'}
                        </Text>
                        <Text style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>
                            Share what stood out while it is still fresh.
                        </Text>
                    </View>
                </View>

                {/* Title & Subtitle */}
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Text
                        style={{
                            color: colors.text,
                            fontSize: 24,
                            fontWeight: '700',
                            textAlign: 'center',
                            marginBottom: 6,
                        }}
                    >
                        How are you feeling?
                    </Text>
                    <Text
                        style={{
                            color: colors.icon,
                            fontSize: 14,
                            textAlign: 'center',
                            paddingHorizontal: 16,
                        }}
                    >
                        Your input helps improve future exam attempts.
                    </Text>
                </View>

                {/* Validation Error Alert */}
                {validationError ? (
                    <View
                        style={{
                            backgroundColor: '#fee2e2',
                            borderColor: '#ef4444',
                            borderWidth: 1,
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 16,
                        }}
                    >
                        <Text style={{ color: '#b91c1c', fontSize: 13, fontWeight: '500' }}>
                            {validationError}
                        </Text>
                    </View>
                ) : null}

                {/* 5-tier Emoji Rating Selector */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                    }}
                >
                    {RATING_OPTIONS.map((option) => {
                        const isSelected = rating === option.value;
                        return (
                            <TouchableOpacity
                                key={option.value}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setRating(option.value);
                                    setValidationError(null);
                                }}
                                style={{
                                    alignItems: 'center',
                                    flex: 1,
                                    marginHorizontal: 4,
                                }}
                            >
                                <View
                                    style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 18,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isSelected
                                            ? colors.primary + '20'
                                            : isDark
                                              ? '#1e293b'
                                              : '#f1f5f9',
                                        borderWidth: isSelected ? 2 : 1,
                                        borderColor: isSelected
                                            ? colors.primary
                                            : isDark
                                              ? '#334155'
                                              : '#e2e8f0',
                                        marginBottom: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 24 }}>{option.emoji}</Text>
                                </View>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: isSelected ? '700' : '500',
                                        color: isSelected ? colors.text : colors.icon,
                                    }}
                                >
                                    {option.label}
                                </Text>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginTop: 2,
                                    }}
                                >
                                    <Ionicons
                                        name="star"
                                        size={10}
                                        color={isSelected ? colors.primary : colors.icon}
                                        style={{ marginRight: 2 }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            color: isSelected ? colors.primary : colors.icon,
                                        }}
                                    >
                                        {option.value}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Rating Description Card */}
                <View
                    style={{
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 24,
                        alignItems: 'center',
                    }}
                >
                    <Text
                        style={{
                            color: colors.text,
                            fontSize: 14,
                            fontWeight: '600',
                            marginBottom: 2,
                        }}
                    >
                        {selectedRatingOption?.label ?? 'Select a rating'}
                    </Text>
                    <Text
                        style={{
                            color: colors.icon,
                            fontSize: 12,
                            textAlign: 'center',
                        }}
                    >
                        {selectedRatingOption?.description ??
                            'Choose the option that best matches your exam session.'}
                    </Text>
                </View>

                {/* Experience Text Area */}
                <View style={{ marginBottom: 28 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                        }}
                    >
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                            Experience details (optional)
                        </Text>
                        <Text style={{ color: colors.icon, fontSize: 11 }}>
                            {experience.length}/2000
                        </Text>
                    </View>
                    <TextInput
                        value={experience}
                        onChangeText={setExperience}
                        placeholder="Share anything that worked well or felt confusing during the exam flow."
                        placeholderTextColor={colors.icon}
                        multiline
                        numberOfLines={4}
                        maxLength={2000}
                        style={{
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            color: colors.text,
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                            borderWidth: 1,
                            borderRadius: 16,
                            padding: 14,
                            minHeight: 100,
                            textAlignVertical: 'top',
                            fontSize: 14,
                        }}
                    />
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSubmit}
                    disabled={createFeedbackMutation.isPending}
                    style={{
                        backgroundColor: colors.text,
                        borderRadius: 16,
                        height: 50,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                    }}
                >
                    {createFeedbackMutation.isPending ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text
                            style={{
                                color: colors.background,
                                fontSize: 16,
                                fontWeight: '600',
                            }}
                        >
                            Submit Feedback
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleSkip}
                    style={{
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text
                        style={{
                            color: colors.icon,
                            fontSize: 14,
                            fontWeight: '500',
                        }}
                    >
                        Skip for now
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
