import React from 'react';
import { View, StatusBar, ActivityIndicator } from 'react-native';
import { useExamResult } from '@/features/exam/hooks/use-exam-result';
import { ResultView } from '@/features/exam/components/detail/result-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResultScreen() {
    const { exam, questions, summary, answers, colors, handleTurnIn } = useExamResult();
    const insets = useSafeAreaInsets();

    if (!exam) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                }}
            >
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
            <StatusBar barStyle={colors.text === '#11181C' ? 'dark-content' : 'light-content'} />
            <ResultView
                exam={exam}
                questions={questions}
                summary={summary}
                answers={answers}
                onReturnToDashboard={handleTurnIn}
            />
        </View>
    );
}
