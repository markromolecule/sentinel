export const ACCESS_CONTROL_QUERY_KEYS = {
    all: ['access-control'] as const,
    overview: () => [...ACCESS_CONTROL_QUERY_KEYS.all, 'overview'] as const,
    roles: () => [...ACCESS_CONTROL_QUERY_KEYS.all, 'roles'] as const,
    permissions: () => [...ACCESS_CONTROL_QUERY_KEYS.all, 'permissions'] as const,
    assignments: () => [...ACCESS_CONTROL_QUERY_KEYS.all, 'assignments'] as const,
    examinationSettings: () => [...ACCESS_CONTROL_QUERY_KEYS.all, 'examination-settings'] as const,
    baselineEssayRubric: () => [...ACCESS_CONTROL_QUERY_KEYS.all, 'baseline-essay-rubric'] as const,
};

/** @deprecated For backward compatibility with static roles */
export const SUPPORT_ASSIGNABLE_ROLE_NAMES = ['superadmin', 'admin', 'instructor'] as const;

export const DEFAULT_EXAMINATION_GLOBAL_SETTINGS = {
    defaultDurationMinutes: 60,
    defaultPassingScore: 70,
    defaultShuffleQuestions: true,
    defaultShowCorrectAnswers: false,
    defaultAllowReview: true,
    defaultRandomizeChoices: true,
    defaultLobbyAdmissionMode: 'INSTRUCTOR_GATED',
    defaultMaxReconnectAttempts: 3,
    defaultStrictMode: true,
    defaultCameraRequired: true,
    defaultMicRequired: true,
    defaultScreenLock: true,
    defaultAutoSubmitTimeoutMinutes: 5,
    defaultAiRules: {
        gaze_tracking: true,
        face_detection: true,
        audio_anomaly_detection: true,
        multiple_faces_detection: true,
    },
    defaultWebSecurity: {
        tab_switching_monitor: true,
        full_screen_required: true,
        clipboard_control: true,
        right_click_disable: true,
        print_screen_disable: true,
    },
    defaultMobileSecurity: {
        app_pinning_required: true,
        prevent_backgrounding: true,
        notification_block: true,
        screenshot_block: true,
        root_jailbreak_detection: true,
    },
} as const;
