'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ExamConfiguration, ExamRuntimeAccess } from '@sentinel/shared/types';
import { readStoredStudentExamFlow } from '../../_lib/student-exam-flow';
import { useStudentExamMediaPipeStream } from '@/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider';
import { useCheckupAudio } from '@/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider';

export type UseLobbyReadinessArgs = {
    examId: string;
    isMediaPipeValid: boolean;
    configuration?: ExamConfiguration;
    runtimeAccess?: ExamRuntimeAccess | null;
};

export function useLobbyReadiness({
    examId,
    isMediaPipeValid,
    configuration,
    runtimeAccess,
}: UseLobbyReadinessArgs) {
    const storedFlow = useMemo(() => readStoredStudentExamFlow(examId), [examId]);
    const { isCameraReady, isLandmarkerReady } = useStudentExamMediaPipeStream();
    const { isAudioReady } = useCheckupAudio();
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true,
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const cameraOk = !configuration || isCameraReady(configuration);
    const audioOk = !configuration || isAudioReady(configuration);
    const landmarkerOk = !configuration || isLandmarkerReady(configuration);
    const hasActiveAttempt = Boolean(runtimeAccess?.hasActiveAttempt);
    const hasStoredCheckupCompletion = Boolean(
        storedFlow.privacyAccepted && storedFlow.checkupCompleted && isOnline,
    );

    const hasCompletedFlow = useMemo(
        () =>
            Boolean(
                hasStoredCheckupCompletion &&
                (hasActiveAttempt || (isMediaPipeValid && cameraOk && audioOk && landmarkerOk)),
            ),
        [
            hasStoredCheckupCompletion,
            hasActiveAttempt,
            isMediaPipeValid,
            cameraOk,
            audioOk,
            landmarkerOk,
        ],
    );

    return {
        storedFlow,
        isCameraReady: cameraOk,
        isAudioReady: audioOk,
        isLandmarkerReady: landmarkerOk,
        isOnline,
        hasCompletedFlow,
    };
}
