export const TELEMETRY_QUERY_KEYS = {
    all: ['telemetry'] as const,
    settings: () => [...TELEMETRY_QUERY_KEYS.all, 'settings'] as const,
    health: () => [...TELEMETRY_QUERY_KEYS.all, 'health'] as const,
    incidents: (filters?: Record<string, unknown>) =>
        [...TELEMETRY_QUERY_KEYS.all, 'incidents', filters ?? {}] as const,
    incidentEvidence: (incidentId?: string) =>
        [...TELEMETRY_QUERY_KEYS.all, 'incident-evidence', incidentId ?? 'unknown'] as const,
} as const;

export const TELEMETRY_MEDIAPIPE_SANDBOX_V1_EVENT_TYPES = [
    'GAZE_OFF_SCREEN',
    'NO_FACE_DETECTED',
    'MULTIPLE_FACES',
] as const;

export const TELEMETRY_MEDIAPIPE_SANDBOX_V1_INERT_FIELDS = [

] as const;

export const TELEMETRY_MEDIAPIPE_SANDBOX_V1_PREREQUISITES = [
    'Checkup calibration validation',
    'Attempt emission dry-run verification',
    'Instructor incident review alignment',
] as const;

export const DEFAULT_TELEMETRY_SETTINGS = {
    version: 1,
    operations: {
        enabled: true,
        ingestionMode: 'sync',
        batchingEnabled: true,
        batchWindowMs: 5000,
        maxBatchSize: 500,
        dedupeWindowSeconds: 120,
    },
    ruleOverrides: {
        'aiRules.gaze_tracking': {},
        'aiRules.face_detection': {},
        'aiRules.audio_anomaly_detection': {},
        'aiRules.multiple_faces_detection': {},
        'webSecurity.tab_switching_monitor': {},
        'webSecurity.full_screen_required': {},
        'webSecurity.clipboard_control': {},
        'webSecurity.right_click_disable': {},
        'webSecurity.print_screen_disable': {},
        'mobileSecurity.app_pinning_required': {},
        'mobileSecurity.prevent_backgrounding': {},
        'mobileSecurity.notification_block': {},
        'mobileSecurity.screenshot_block': {},
        'mobileSecurity.root_jailbreak_detection': {},
    },
    mediaPipeSandbox: {
        enabled: false,
        captureDuringCheckup: false,
        emitDuringExam: false,
        confidenceThreshold: 0.8,
        frameIntervalMs: 500,
        offScreenDurationMs: 3000,
        calibrationRequired: false,
        debugOverlayEnabled: false,
    },
} as const;
