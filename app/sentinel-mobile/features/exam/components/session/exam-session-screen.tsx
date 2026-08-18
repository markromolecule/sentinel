import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Stack, useNavigation, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { CameraView } from 'expo-camera';

import { useExamSession } from '@/features/exam/hooks/use-exam-session';
import { QuestionDrawer } from '@/features/exam/components/session/question-drawer';
import { SessionHeader } from './session-header';
import { QuestionCard } from './question-card';
import { SessionFooter } from './session-footer';

import { useApi, useAuth } from '@sentinel/hooks';
import { useMobileMediaPipeMonitoring } from '../../hooks/use-mobile-mediapipe-monitoring';
import { MobileLiveInspectionBridge } from './mobile-live-inspection-bridge';
import { captureAndUploadEvidenceFrame } from '../../lib/mobile-frame-capture';
import { MobileMediaPipeBridge } from '../checkup/mobile-mediapipe-bridge';

export const ExamSessionScreen = () => {
    const {
        exam,
        questions,
        currentQuestion,
        currentIndex,
        setCurrentIndex,
        answers,
        flagged,
        isDrawerOpen,
        setIsDrawerOpen,
        timeLeft,
        formatTime,
        handleSelectOption,
        toggleFlag,
        handleNext,
        handlePrev,
        isLastQuestion,
    } = useExamSession();

    const { id: examId, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
    const apiClient = useApi();
    const { supabase, session } = useAuth();
    const cameraRef = useRef<any>(null);
    const [landmarksByFace, setLandmarksByFace] = useState<any[][]>([]);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    // Proctoring bridge and MediaPipe real-time monitoring
    const handleAnomaly = async (
        eventType: 'GAZE_OFF_SCREEN' | 'MULTIPLE_FACES' | 'NO_FACE_DETECTED',
    ) => {
        if (!exam || !sessionId || !session?.user?.id) return;
        try {
            await captureAndUploadEvidenceFrame({
                cameraRef,
                attemptId: sessionId,
                examSessionId: sessionId,
                studentId: session.user.id,
                eventType,
                apiClient,
                supabase,
            });
        } catch (err) {
            console.error('Failed to capture and upload evidence frame', err);
        }
    };

    const { warningStatus } = useMobileMediaPipeMonitoring({
        examId: typeof examId === 'string' ? examId : '',
        apiClient,
        configuration: exam?.configuration,
        mediaPipeSandbox: exam?.mediaPipeSandbox,
        examSessionId: typeof sessionId === 'string' ? sessionId : '',
        studentId: session?.user?.id,
        landmarksByFace,
        onAnomalyDetected: handleAnomaly,
    });

    const getLiveVideoTrack = () => {
        // Return dummy track for LiveKit publisher compatibility on mobile
        return {
            stop: () => {},
            enabled: true,
            muted: false,
        };
    };

    if (!exam) {
        return (
            <View
                style={{ backgroundColor: colors.background }}
                className="flex-1 items-center justify-center"
            >
                <Text style={{ color: colors.text }}>Exam not found</Text>
            </View>
        );
    }

    return (
        <View style={{ backgroundColor: colors.background }} className="flex-1">
            <Stack.Screen
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    fullScreenGestureEnabled: false,
                    headerLeft: () => null,
                }}
            />

            {/* Hidden CameraView or MediaPipe Bridge for proctor streaming and image capture */}
            {exam.configuration?.cameraRequired !== false && (
                Boolean(exam.mediaPipeSandbox?.enabled && exam.mediaPipeSandbox?.emitDuringExam) ? (
                    <MobileMediaPipeBridge
                        ref={cameraRef}
                        onLandmarksDetected={(landmarks) => {
                            setLandmarksByFace(landmarks);
                        }}
                        frameIntervalMs={exam.mediaPipeSandbox?.frameIntervalMs ?? 1000}
                        facing="front"
                        showPreview={false}
                    />
                ) : (
                    <CameraView
                        ref={cameraRef}
                        facing="front"
                        style={{
                            position: 'absolute',
                            width: 1,
                            height: 1,
                            opacity: 0,
                        }}
                    />
                )
            )}

            <SessionHeader
                title={exam.title}
                subject={exam.subject}
                totalQuestions={questions.length}
                currentIndex={currentIndex}
                timeLeft={timeLeft}
                formatTime={formatTime}
            />

            {/* Security Anomaly Violation Alert Banner */}
            {warningStatus && (
                <View
                    accessibilityLabel="Security Warning Alert"
                    style={{
                        backgroundColor: '#ef4444',
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                        ⚠️ Warning: {warningStatus}
                    </Text>
                </View>
            )}

            <QuestionCard
                question={currentQuestion}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                selectedOptionId={answers[currentQuestion?.id]}
                isFlagged={!!flagged[currentQuestion?.id]}
                onSelectOption={handleSelectOption}
                onToggleFlag={toggleFlag}
            />

            <SessionFooter
                onPrev={handlePrev}
                onNext={handleNext}
                onToggleDrawer={() => setIsDrawerOpen(true)}
                isFirst={currentIndex === 0}
                isLast={isLastQuestion}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
            />

            {isDrawerOpen && (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setIsDrawerOpen(false)}
                    className="absolute inset-0 z-10" // Transparent backdrop to catch clicks
                />
            )}

            <QuestionDrawer
                visible={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                questions={questions}
                currentIndex={currentIndex}
                onSelectQuestion={setCurrentIndex}
                answers={answers as Record<string, string>}
                flaggedQuestions={flagged}
                colors={colors}
                isDark={isDark}
                bottomOffset={80 + insets.bottom}
            />

            {/* Proctor Live Viewing Stream Indicator */}
            <MobileLiveInspectionBridge
                sessionId={sessionId || null}
                attemptId={sessionId || null}
                enabled={Boolean(exam.configuration?.cameraRequired !== false)}
                getLiveVideoTrack={getLiveVideoTrack}
            />
        </View>
    );
};
