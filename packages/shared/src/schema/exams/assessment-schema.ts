import * as z from 'zod';

export const QUESTION_TYPES = [
    'MULTIPLE_CHOICE',
    'MULTIPLE_RESPONSE',
    'TRUE_FALSE',
    'IDENTIFICATION',
    'MATCHING',
    'ESSAY',
    'FILL_BLANK',
    'ENUMERATION',
] as const;

export const QUESTION_DIFFICULTIES = ['EASY', 'MODERATE', 'HARD'] as const;
export const QUESTION_SOURCE_ORIGINS = ['MANUAL', 'AI_PDF'] as const;
export const PASSAGE_TYPES = ['plain', 'html'] as const;
export const EXAM_LOBBY_ADMISSION_MODES = ['AUTOMATIC', 'INSTRUCTOR_GATED'] as const;

export const BLOOM_COGNITIVE_LEVELS = [
    'REMEMBERING',
    'UNDERSTANDING',
    'APPLYING',
    'ANALYZING',
    'EVALUATING',
    'CREATING',
] as const;

export const QUESTION_BANK_STATUSES = ['ACTIVE', 'RETIRED', 'COOLING_OFF', 'ARCHIVED'] as const;

export const EXAM_STATUSES = [
    'draft',
    'published',
    'archived',
    'scheduled',
    'available',
    'completed',
    'in-progress',
    'upcoming',
    'active',
    'past_due',
    'turned_in',
] as const;

export const STUDENT_EXAM_STATUSES = [
    'upcoming',
    'available',
    'in-progress',
    'past_due',
    'turned_in',
] as const;

export const questionTypeSchema = z.enum(QUESTION_TYPES);
export const questionDifficultySchema = z.enum(QUESTION_DIFFICULTIES);
export const questionSourceOriginSchema = z.enum(QUESTION_SOURCE_ORIGINS);
export const passageTypeSchema = z.enum(PASSAGE_TYPES);
export const examLobbyAdmissionModeSchema = z.enum(EXAM_LOBBY_ADMISSION_MODES);
export const bloomCognitiveLevelSchema = z.enum(BLOOM_COGNITIVE_LEVELS);
export const questionBankStatusSchema = z.enum(QUESTION_BANK_STATUSES);

export const questionContentSchema = z.record(z.string(), z.any());

export const questionTagsSchema = z.array(z.string().trim().min(1)).default([]);

export const questionSourceMetadataInputSchema = z
    .object({
        sourceOrigin: questionSourceOriginSchema.optional(),
        sourceFileName: z.string().trim().min(1).max(255).nullable().optional(),
        sourcePageNumber: z.number().int().min(1).nullable().optional(),
        sourceEvidence: z.string().trim().min(1).max(1000).nullable().optional(),
    })
    .superRefine((value, ctx) => {
        if (value.sourceOrigin !== 'AI_PDF') {
            return;
        }

        if (!value.sourceFileName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'AI PDF questions must include a source file name.',
                path: ['sourceFileName'],
            });
        }

        if (!value.sourcePageNumber) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'AI PDF questions must include a source page number.',
                path: ['sourcePageNumber'],
            });
        }

        if (!value.sourceEvidence) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'AI PDF questions must include source evidence.',
                path: ['sourceEvidence'],
            });
        }
    });

export const examSettingsSchema = z.object({
    shuffleQuestions: z.boolean().default(false),
    showCorrectAnswers: z.boolean().default(false),
    allowReview: z.boolean().default(false),
    randomizeChoices: z.boolean().default(false),
});

export const examConfigurationSchema = z.object({
    // 1. Shared Core & Hardware
    lobbyAdmissionMode: examLobbyAdmissionModeSchema.default('AUTOMATIC'),
    releaseScoreMode: z.enum(['AUTO_RELEASE', 'MANUAL_RELEASE']).default('AUTO_RELEASE'),
    maxReconnectAttempts: z.number().int().min(0).default(3),
    strictMode: z.boolean().default(true),
    screenLock: z.boolean().default(true),
    cameraRequired: z.boolean().default(true),
    micRequired: z.boolean().default(true),
    autoSubmitTimeoutMinutes: z.number().int().min(0).default(5),

    // 2. Shared AI Monitoring Rules
    aiRules: z
        .object({
            gaze_tracking: z.boolean().default(true),
            face_detection: z.boolean().default(true),
            audio_anomaly_detection: z.boolean().default(true),
            multiple_faces_detection: z.boolean().default(true),
        })
        .default({
            gaze_tracking: true,
            face_detection: true,
            audio_anomaly_detection: true,
            multiple_faces_detection: true,
        }),

    // 3. Web-Specific Security Settings
    webSecurity: z
        .object({
            tab_switching_monitor: z.boolean().default(true),
            full_screen_required: z.boolean().default(true),
            clipboard_control: z.boolean().default(true),
            right_click_disable: z.boolean().default(true),
            print_screen_disable: z.boolean().default(true),
        })
        .default({
            tab_switching_monitor: true,
            full_screen_required: true,
            clipboard_control: true,
            right_click_disable: true,
            print_screen_disable: true,
        }),

    // 4. Mobile-Specific Security Settings (Android/iOS)
    mobileSecurity: z
        .object({
            app_pinning_required: z.boolean().default(true),
            prevent_backgrounding: z.boolean().default(true),
            notification_block: z.boolean().default(true),
            screenshot_block: z.boolean().default(true),
            root_jailbreak_detection: z.boolean().default(true),
        })
        .default({
            app_pinning_required: true,
            prevent_backgrounding: true,
            notification_block: true,
            screenshot_block: true,
            root_jailbreak_detection: true,
        }),

    // 5. Automatic Close Policy
    automaticClosePolicy: z
        .object({
            enabled: z.boolean().default(true),
            highIncidentThreshold: z.number().int().min(1).default(3),
            windowMinutes: z.number().int().min(1).default(15),
            useOccurrenceCount: z.boolean().default(false),
            immediateCloseEventTypes: z.array(z.string()).default([]),
        })
        .default({
            enabled: true,
            highIncidentThreshold: 3,
            windowMinutes: 15,
            useOccurrenceCount: false,
            immediateCloseEventTypes: [],
        }),
});

export const examStatusSchema = z.enum(EXAM_STATUSES);
export const studentExamStatusSchema = z.enum(STUDENT_EXAM_STATUSES);

export const questionInputSchema = z
    .object({
        subjectId: z.string().uuid().optional(),
        type: questionTypeSchema,
        difficulty: questionDifficultySchema.default('MODERATE'),
        points: z.number().int().min(1).max(100).default(1),
        tags: questionTagsSchema.optional(),
        content: questionContentSchema,
        passageContent: z.string().nullable().optional(),
        passageType: passageTypeSchema.optional().default('plain'),
        // TOS metadata fields (populated by AI generation)
        topic: z.string().trim().min(1).max(255).optional(),
        cognitiveLevel: bloomCognitiveLevelSchema.optional(),
        predictedDifficulty: questionDifficultySchema.optional(),
    })
    .merge(questionSourceMetadataInputSchema);

// ============================================================================
// TYPES
// ============================================================================

export type BloomCognitiveLevel = z.infer<typeof bloomCognitiveLevelSchema>;
export type QuestionBankStatus = z.infer<typeof questionBankStatusSchema>;

export const essayRubricCriterionEvaluationSchema = z.record(
    z.string(),
    z.number().int().min(0).max(4),
);

export const essayQuestionEvaluationSchema = z.object({
    scores: essayRubricCriterionEvaluationSchema,
    score: z.number().min(0),
    feedback: z.string().optional().nullable(),
});

export const attemptEvaluationsSchema = z.record(z.string().uuid(), essayQuestionEvaluationSchema);

export type EssayRubricCriterionEvaluation = z.infer<typeof essayRubricCriterionEvaluationSchema>;
export type EssayQuestionEvaluation = z.infer<typeof essayQuestionEvaluationSchema>;
export type AttemptEvaluations = z.infer<typeof attemptEvaluationsSchema>;
