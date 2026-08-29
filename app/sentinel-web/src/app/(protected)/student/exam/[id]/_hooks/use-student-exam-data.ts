'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useExamConfigurationQuery, useExamQuery } from '@sentinel/hooks';
import { DEFAULT_TELEMETRY_SETTINGS } from '@sentinel/shared';
import type {
    ExamConfiguration,
    ExamQuestion,
    ExamSettings,
    ProctorExam,
} from '@sentinel/shared/types';

const DEFAULT_SETTINGS: ExamSettings = {
    shuffleQuestions: false,
    showCorrectAnswers: false,
    allowReview: true,
    randomizeChoices: false,
};

const DEFAULT_CONFIGURATION: ExamConfiguration = {
    lobbyAdmissionMode: 'AUTOMATIC',
    maxReconnectAttempts: 3,
    strictMode: true,
    screenLock: true,
    cameraRequired: true,
    micRequired: true,
    autoSubmitTimeoutMinutes: 5,
    aiRules: {
        gaze_tracking: true,
        face_detection: true,
        audio_anomaly_detection: false,
        multiple_faces_detection: true,
    },
    webSecurity: {
        tab_switching_monitor: true,
        full_screen_required: true,
        clipboard_control: true,
        right_click_disable: true,
        print_screen_disable: true,
    },
    mobileSecurity: {
        app_pinning_required: true,
        prevent_backgrounding: true,
        notification_block: true,
        screenshot_block: true,
        root_jailbreak_detection: false,
    },
};

function sortQuestions(exam: ProctorExam | null, settings?: ExamSettings): ExamQuestion[] {
    if (!exam?.questions?.length) {
        return [];
    }

    if (settings?.shuffleQuestions) {
        return exam.questions;
    }

    return [...exam.questions].sort((left, right) => left.orderIndex - right.orderIndex);
}

function resolveLifecycleBlockedState(exam: ProctorExam | null) {
    const runtimeAccess = exam?.runtimeAccess;

    if (
        !runtimeAccess ||
        runtimeAccess.canStart ||
        runtimeAccess.canResume ||
        exam?.status === 'turned_in' ||
        exam?.completedAt != null
    ) {
        return {
            isBlocked: false,
            code: null,
            title: null,
            message: null,
        } as const;
    }

    if (runtimeAccess.state === 'locked') {
        return {
            isBlocked: true,
            code: 'LOCKED',
            title: 'Exam Locked',
            message: runtimeAccess.message,
        } as const;
    }

    if (runtimeAccess.state === 'closed') {
        const isSuperseded = /reset|replaced|superseded/i.test(runtimeAccess.message);

        return {
            isBlocked: true,
            code: isSuperseded ? 'SUPERSEDED' : 'CLOSED',
            title: isSuperseded ? 'Attempt Replaced' : 'Exam Closed',
            message: runtimeAccess.message,
        } as const;
    }

    return {
        isBlocked: false,
        code: null,
        title: null,
        message: null,
    } as const;
}

export function useStudentExamData() {
    const params = useParams();
    const examId = params.id as string;
    const {
        data: exam,
        isLoading: isExamLoading,
        isError: isExamError,
        refetch: refetchExam,
    } = useExamQuery(examId, {
        viewer: 'student',
    });
    const {
        data: configurationState,
        isLoading: isConfigurationLoading,
        isError: isConfigurationError,
    } = useExamConfigurationQuery(examId);

    const hasAuthoritativeConfig = Boolean(
        configurationState?.configuration || exam?.configuration,
    );

    const settings = configurationState?.settings ?? exam?.settings ?? DEFAULT_SETTINGS;
    const configuration =
        configurationState?.configuration ?? exam?.configuration ?? DEFAULT_CONFIGURATION;
    const questions = useMemo(() => sortQuestions(exam ?? null, settings), [exam, settings]);
    const blockedState = useMemo(() => resolveLifecycleBlockedState(exam ?? null), [exam]);

    const mediaPipeSandbox = exam?.mediaPipeSandbox ?? DEFAULT_TELEMETRY_SETTINGS.mediaPipeSandbox;

    const configQueryError = isConfigurationError && !hasAuthoritativeConfig;

    return {
        examId,
        exam: exam ?? null,
        blockedState,
        settings,
        configuration,
        mediaPipeSandbox,
        questions,
        refetchExam,
        // The exam detail response already carries a configuration snapshot for
        // student routes. Do not leave the reconnect/lobby flow blocked on the
        // supplemental configuration request once that authoritative data is
        // available.
        isLoading: isExamLoading || (isConfigurationLoading && !hasAuthoritativeConfig),
        isConfigurationError,
        configQueryError,
        isExamError,
        hasAuthoritativeConfig,
    };
}
