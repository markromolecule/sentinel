import type { ExamRuntimeAccessState, MediaPipeCalibrationProfile } from '@sentinel/shared';

export const STUDENT_EXAM_STAGES = [
    'instruction',
    'privacy',
    'checkup',
    'lobby',
    'attempt',
] as const;

export type StudentExamStage = (typeof STUDENT_EXAM_STAGES)[number];

export const STUDENT_EXAM_FLOW_HEADER_STAGES = [
    'instruction',
    'privacy',
    'checkup',
    'lobby',
] as const;

export type StudentExamFlowHeaderStage = (typeof STUDENT_EXAM_FLOW_HEADER_STAGES)[number];

export type StudentExamMediaPipeActivationSource = 'checkup';

export type StudentExamMediaPipeSandboxLike = {
    enabled: boolean;
    captureDuringCheckup: boolean;
    emitDuringExam: boolean;
    confidenceThreshold: number;
    frameIntervalMs: number;
    offScreenDurationMs: number;
    calibrationRequired: boolean;
    debugOverlayEnabled: boolean;
};

export type StudentExamMediaPipeConfigurationLike = {
    cameraRequired?: boolean;
    aiRules?: {
        gaze_tracking?: boolean;
        face_detection?: boolean;
        multiple_faces_detection?: boolean;
    };
};

export type StoredStudentExamFlow = {
    privacyAccepted: boolean;
    checkupCompleted: boolean;
    mediaPipeActivatedAt: string | null;
    mediaPipeCalibrationCompletedAt: string | null;
    mediaPipeActivationSource: StudentExamMediaPipeActivationSource | null;
    mediaPipeCalibrationProfile: MediaPipeCalibrationProfile | null;
};

export type StudentExamStageResolverReason =
    | 'TURNED_IN'
    | 'BLOCKED_LOCKED'
    | 'BLOCKED_CLOSED'
    | 'BLOCKED_SUPERSEDED'
    | 'CONFIG_ERROR'
    | 'MAX_RECONNECT_EXCEEDED'
    | 'PRIVACY_REQUIRED'
    | 'PRIVACY_ACCEPTED'
    | 'CHECKUP_REQUIRED'
    | 'MEDIAPIPE_STALE'
    | 'LOBBY_GATED_WAITING'
    | 'LOBBY_GATED_REJECTED'
    | 'LOBBY_GATED_APPROVED'
    | 'ATTEMPT_ACTIVE'
    | 'AUTOMATIC_ADMISSION'
    | 'INSTRUCTION';

export type StudentExamStageResolverInput = {
    requestedStage: StudentExamStage | 'result' | 'history' | string;
    privacyAccepted: boolean;
    checkupCompleted: boolean;
    mediaPipeStatus: 'ready' | 'missing' | 'stale' | 'not-required';
    admissionMode: 'AUTOMATIC' | 'INSTRUCTOR_GATED' | null;
    admissionState: 'pending' | 'approved' | 'rejected' | null;
    runtimeAccess?: {
        canStart?: boolean;
        canResume?: boolean;
        isAttemptActive?: boolean;
        isTurnedIn?: boolean;
        reconnectCount?: number;
        maxReconnectAttempts?: number;
        state?: ExamRuntimeAccessState | null;
        blockedCode?: 'LOCKED' | 'CLOSED' | 'SUPERSEDED' | null;
    } | null;
    configQueryError?: boolean;
    examQueryError?: boolean;
    hasFreshLobbyEntry?: boolean;
    hasReconnectIntent?: boolean;
    storedSessionId?: string;
    lobbyEntrySessionId?: string;
};

export type StudentExamStageResolverResult = {
    targetStage: StudentExamStage | 'result';
    reasonCode: StudentExamStageResolverReason;
    shouldRedirect: boolean;
};
