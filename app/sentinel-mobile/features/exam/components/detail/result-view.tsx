import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { buildExamAttemptQuestionReports } from '@sentinel/shared';
import type { MobileExamDisplay } from '@/features/exam/lib/mobile-exam-adapter';
import type { ExamAttemptAnswers, ExamAttemptScoreSummary } from '@sentinel/shared/types';

export interface ResultViewProps {
    exam: MobileExamDisplay;
    summary: ExamAttemptScoreSummary & { completedAt?: string };
    answers: ExamAttemptAnswers;
    onReturnToDashboard: () => void;
}

export function ResultView({ exam, summary, answers, onReturnToDashboard }: ResultViewProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const isPassed = (summary.percentage ?? 0) >= (exam.passingPercentage ?? 50);

    const formattedDate = summary.completedAt
        ? new Date(summary.completedAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    // Compute Section Breakdown
    const reports = buildExamAttemptQuestionReports({
        questions: exam.questions as any || [],
        answers: answers as any,
    });

    const sections = exam.questionSections || [];
    const hasSections = sections.length > 0;

    const breakdown = hasSections
        ? sections
            .map((sec) => {
                const secQuestions = (exam.questions as any || []).filter(
                    (q: any) => q.sectionId === sec.id
                );
                const secReports = reports.filter((r) =>
                    secQuestions.some((sq: any) => sq.id === r.questionId)
                );
                const score = secReports.reduce((sum, r) => sum + (r.awardedScore ?? 0), 0);
                const maxScore = secReports.reduce((sum, r) => sum + r.maxScore, 0);
                const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                return {
                    id: sec.id,
                    title: sec.title,
                    score,
                    maxScore,
                    percentage,
                };
            })
            .filter((b) => b.maxScore > 0)
        : [
            {
                id: 'general',
                title: 'Core Assessment',
                score: summary.score,
                maxScore: summary.totalScore,
                percentage: summary.percentage ?? 0,
            },
        ];

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Pass/Fail Header Card */}
            <View
                style={[
                    styles.headerCard,
                    {
                        backgroundColor: isPassed
                            ? isDark
                                ? 'rgba(16, 185, 129, 0.1)'
                                : '#ecfdf5'
                            : isDark
                                ? 'rgba(239, 68, 68, 0.1)'
                                : '#fef2f2',
                        borderColor: isPassed
                            ? isDark
                                ? 'rgba(16, 185, 129, 0.2)'
                                : '#d1fae5'
                            : isDark
                                ? 'rgba(239, 68, 68, 0.2)'
                                : '#fee2e2',
                    },
                ]}
            >
                <View
                    style={[
                        styles.iconContainer,
                        {
                            backgroundColor: isPassed ? '#10b981' : '#ef4444',
                        },
                    ]}
                >
                    <Ionicons
                        name={isPassed ? 'checkmark-circle' : 'close-circle'}
                        size={32}
                        color="#fff"
                    />
                </View>
                <Text
                    style={[
                        styles.statusLabel,
                        { color: isPassed ? '#059669' : '#dc2626' },
                    ]}
                >
                    {isPassed ? 'PASSED' : 'DID NOT PASS'}
                </Text>
                <Text style={[styles.titleText, { color: colors.text }]}>
                    {exam.title}
                </Text>
                <Text style={styles.dateText}>
                    Completed on {formattedDate}
                </Text>
            </View>

            {/* Score Radial Badge Replacement */}
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.percentageCircle}>
                    <Text style={[styles.percentageText, { color: isPassed ? '#10b981' : '#ef4444' }]}>
                        {summary.percentage !== null ? `${Math.round(summary.percentage)}%` : '--'}
                    </Text>
                    <Text style={[styles.scoreSubtext, { color: colors.icon }]}>
                        Passing Score: {exam.passingPercentage}%
                    </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                        <Text style={[styles.metricValue, { color: colors.text }]}>
                            {summary.score} / {summary.totalScore}
                        </Text>
                        <Text style={[styles.metricLabel, { color: colors.icon }]}>Points</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={[styles.metricValue, { color: colors.text }]}>
                            {summary.answeredCount}
                        </Text>
                        <Text style={[styles.metricLabel, { color: colors.icon }]}>Answered</Text>
                    </View>
                </View>
            </View>

            {/* Proctoring Verification Indicator */}
            <View
                style={[
                    styles.proctorCard,
                    {
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                        borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
                    },
                ]}
            >
                <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
                <Text style={styles.proctorText}>
                    Exam verified under security policy
                </Text>
            </View>

            {/* Section Breakdown */}
            <View style={styles.breakdownContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Performance Breakdown
                </Text>
                {breakdown.map((item) => (
                    <View
                        key={item.id}
                        style={[
                            styles.breakdownItem,
                            { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                    >
                        <View style={styles.breakdownHeader}>
                            <Text style={[styles.breakdownName, { color: colors.text }]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={[styles.breakdownScore, { color: colors.text }]}>
                                {item.score}/{item.maxScore} ({item.percentage}%)
                            </Text>
                        </View>
                        <View style={styles.progressBarBackground}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${item.percentage}%`,
                                        backgroundColor: item.percentage >= 50 ? '#10b981' : '#f59e0b',
                                    },
                                ]}
                            />
                        </View>
                    </View>
                ))}
            </View>

            {/* Return to Dashboard Button */}
            <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={onReturnToDashboard}
                activeOpacity={0.8}
            >
                <Text style={styles.buttonText}>Return to Dashboard</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
        paddingBottom: 48,
    },
    headerCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    titleText: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 6,
    },
    dateText: {
        fontSize: 12,
        color: '#6b7280',
    },
    scoreCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    percentageCircle: {
        alignItems: 'center',
        marginBottom: 16,
    },
    percentageText: {
        fontSize: 48,
        fontWeight: '800',
    },
    scoreSubtext: {
        fontSize: 12,
        marginTop: 4,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#e4e4e7',
        marginVertical: 16,
    },
    metricsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
    },
    metricItem: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    metricLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    proctorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 24,
    },
    proctorText: {
        marginLeft: 10,
        fontSize: 13,
        fontWeight: '600',
        color: '#2563eb',
    },
    breakdownContainer: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    breakdownItem: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    breakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    breakdownName: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        marginRight: 10,
    },
    breakdownScore: {
        fontSize: 13,
        fontWeight: '700',
    },
    progressBarBackground: {
        width: '100%',
        height: 8,
        backgroundColor: '#e4e4e7',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    button: {
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
