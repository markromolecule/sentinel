import * as z from 'zod';
import {
    examConfigurationSchema,
    examLobbyAdmissionModeSchema,
    examSettingsSchema,
    examStatusSchema,
    studentExamStatusSchema,
    questionContentSchema,
    passageTypeSchema,
    questionSourceOriginSchema,
    questionTypeSchema,
} from './assessment-schema';
import { examRuntimeAccessSchema } from './runtime-access-schema';
import { telemetryMediaPipeSandboxSchema } from '../telemetry/telemetry-settings-schema';

const nullableDateTimeSchema = z.union([z.string(), z.date()]).nullable();
const cheatingTypeSchema = z.enum([
    'gaze',
    'audio',
    'tab_switch',
    'screenshot',
    'screen_record',
    'multiple',
]);
const examResultSchema = z.enum(['passed', 'failed']).nullable();
export const examCategorySchema = z.enum(['CLASSROOM', 'MAJOR']);
const MAX_EXAM_DURATION_MINUTES = 240;

function parseExamDateTime(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const examSectionSchema = z.object({
    id: z.string().uuid(),
    questionType: questionTypeSchema.nullable().optional(),
    title: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
    orderIndex: z.number().int().min(0),
});

export const examQuestionSchema = z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    sectionId: z.string().uuid().nullable().optional(),
    sourceQuestionBankQuestionId: z.string().uuid().nullable().optional(),
    sourceCollectionId: z.string().uuid().nullable().optional(),
    sourceOrigin: questionSourceOriginSchema.optional(),
    sourceFileName: z.string().nullable().optional(),
    sourcePageNumber: z.number().int().min(1).nullable().optional(),
    sourceEvidence: z.string().nullable().optional(),
    passageContent: z.string().nullable().optional(),
    passageType: passageTypeSchema.nullable().optional(),
    type: questionTypeSchema,
    points: z.number().int(),
    orderIndex: z.number().int().min(0),
    tags: z.array(z.string()).default([]),
    content: questionContentSchema,
});

export const examSummarySchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    durationMinutes: z.number().int(),
    passingScore: z.number().int(),
    status: examStatusSchema,
    classroomId: z.string().uuid().nullable(),
    classroomIds: z.array(z.string().uuid()).optional(),
    classroomName: z.string().nullable(),
    classroomNames: z.array(z.string()).optional(),
    subjectId: z.string().uuid().nullable(),
    subjectTitle: z.string().nullable(),
    sectionId: z.string().uuid().nullable(),
    sectionIds: z.array(z.string().uuid()).optional(),
    sectionNames: z.array(z.string()).optional(),
    sectionName: z.string().nullable(),
    roomId: z.string().uuid().nullable(),
    roomName: z.string().nullable(),
    scheduledDate: nullableDateTimeSchema,
    endDateTime: nullableDateTimeSchema,
    publishedAt: nullableDateTimeSchema,
    questionCount: z.number().int().min(0),
    createdAt: nullableDateTimeSchema,
    updatedAt: nullableDateTimeSchema,
    attemptId: z.string().uuid().nullable().optional(),
    completedAt: nullableDateTimeSchema.optional(),
    score: z.number().int().nullable().optional(),
    totalScore: z.number().int().nullable().optional(),
    percentage: z.number().int().min(0).max(100).nullable().optional(),
    timeSpentMinutes: z.number().int().nullable().optional(),
    cheated: z.boolean().optional(),
    cheatingType: cheatingTypeSchema.nullable().optional(),
    incidentCount: z.number().int().min(0).optional(),
    studentsCount: z.number().int().min(0).optional(),
    runtimeAccess: examRuntimeAccessSchema.optional(),
    mediaPipeSandbox: telemetryMediaPipeSandboxSchema.optional(),
    examCategory: examCategorySchema.nullable().optional(),
    isPublic: z.boolean().default(false),
    createdBy: z.string().nullable().optional(),
    createdByName: z.string().nullable().optional(),
    publishedByName: z.string().nullable().optional(),
    /** Rooms aggregated from exam_section_assignments; empty when no room assigned. */
    assignedRoomNames: z.array(z.string()).optional(),
    /** Instructor full names aggregated from exam_section_assignments; empty when none assigned. */
    assignedInstructorNames: z.array(z.string()).optional(),
    /** Instructor IDs aggregated from exam_section_assignments; empty when none assigned. */
    assignedInstructorIds: z.array(z.string()).optional(),
});

export const examDetailSchema = examSummarySchema.extend({
    settings: examSettingsSchema,
    configuration: examConfigurationSchema,
    questionSections: z.array(examSectionSchema),
    questions: z.array(examQuestionSchema),
});

export const examSectionInputSchema = z.object({
    id: z.string().uuid().optional(),
    questionType: questionTypeSchema.nullable().optional(),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(1000).nullable().optional(),
    orderIndex: z.number().int().min(0),
});

export const examQuestionInputSchema = z.object({
    id: z.string().uuid().optional(),
    sectionId: z.string().uuid().nullable().optional(),
    sourceQuestionBankQuestionId: z.string().uuid().nullable().optional(),
    sourceCollectionId: z.string().uuid().nullable().optional(),
    sourceOrigin: questionSourceOriginSchema.optional(),
    sourceFileName: z.string().nullable().optional(),
    sourcePageNumber: z.number().int().min(1).nullable().optional(),
    sourceEvidence: z.string().nullable().optional(),
    passageContent: z.string().nullable().optional(),
    passageType: passageTypeSchema.nullable().optional(),
    type: questionTypeSchema,
    points: z.number().int().min(1).max(100),
    orderIndex: z.number().int().min(0),
    tags: z.array(z.string()).default([]),
    content: questionContentSchema,
});

export const getExamsQuerySchema = z.object({
    search: z.string().optional(),
    status: examStatusSchema.optional(),
    subjectId: z.string().uuid().optional(),
    classroomId: z.string().uuid().optional(),
    institutionId: z.string().uuid().optional(),
    viewer: z.enum(['student', 'staff']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
});

export const examIdParamsSchema = z.object({
    id: z.string().uuid(),
});

export const examReadQuerySchema = z.object({
    viewer: z.enum(['student', 'staff']).optional(),
});

export const examHistoryAttemptParamsSchema = z.object({
    attemptId: z.string().uuid(),
});

export const examHistorySummarySchema = z.object({
    id: z.string(),
    attemptId: z.string().uuid().nullable(),
    examId: z.string().uuid(),
    examTitle: z.string(),
    subject: z.string(),
    sectionIds: z.array(z.string().uuid()).optional(),
    sectionNames: z.array(z.string()).optional(),
    sectionName: z.string().nullable(),
    status: studentExamStatusSchema,
    result: examResultSchema,
    availableAt: nullableDateTimeSchema,
    dueAt: nullableDateTimeSchema,
    completedAt: nullableDateTimeSchema,
    score: z.number().int().nullable(),
    totalScore: z.number().int().nullable(),
    percentage: z.number().int().min(0).max(100).nullable(),
    timeSpent: z.number().int().nullable(),
    cheated: z.boolean(),
    cheatingType: cheatingTypeSchema.nullable(),
    incidentCount: z.number().int().min(0),
});

export const examHistoryDetailSchema = examHistorySummarySchema.extend({
    durationMinutes: z.number().int(),
    passingScore: z.number().int(),
    roomName: z.string().nullable(),
});

const nullableOptionalBooleanSchema = z.boolean().nullable().optional();

const inheritableExamSettingsUpdateSchema = z.object({
    shuffleQuestions: nullableOptionalBooleanSchema,
    showCorrectAnswers: nullableOptionalBooleanSchema,
    allowReview: nullableOptionalBooleanSchema,
    randomizeChoices: nullableOptionalBooleanSchema,
});

const nullableOptionalExamConfigurationUpdateSchema = z
    .object({
        lobbyAdmissionMode: examLobbyAdmissionModeSchema.nullable().optional(),
        releaseScoreMode: z.enum(['AUTO_RELEASE', 'MANUAL_RELEASE']).optional(),
        maxReconnectAttempts: z.number().int().min(0).nullable().optional(),
        strictMode: nullableOptionalBooleanSchema,
        screenLock: nullableOptionalBooleanSchema,
        cameraRequired: nullableOptionalBooleanSchema,
        micRequired: nullableOptionalBooleanSchema,
        autoSubmitTimeoutMinutes: z.number().int().min(0).nullable().optional(),
        aiRules: z
            .object({
                gaze_tracking: nullableOptionalBooleanSchema,
                face_detection: nullableOptionalBooleanSchema,
                audio_anomaly_detection: nullableOptionalBooleanSchema,
                multiple_faces_detection: nullableOptionalBooleanSchema,
            })
            .nullable()
            .optional(),
        webSecurity: z
            .object({
                tab_switching_monitor: nullableOptionalBooleanSchema,
                full_screen_required: nullableOptionalBooleanSchema,
                clipboard_control: nullableOptionalBooleanSchema,
                right_click_disable: nullableOptionalBooleanSchema,
                print_screen_disable: nullableOptionalBooleanSchema,
            })
            .nullable()
            .optional(),
        mobileSecurity: z
            .object({
                app_pinning_required: nullableOptionalBooleanSchema,
                prevent_backgrounding: nullableOptionalBooleanSchema,
                notification_block: nullableOptionalBooleanSchema,
                screenshot_block: nullableOptionalBooleanSchema,
                root_jailbreak_detection: nullableOptionalBooleanSchema,
            })
            .nullable()
            .optional(),
        automaticClosePolicy: examConfigurationSchema.shape.automaticClosePolicy.optional(),
    })
    .nullable();

export const createExamBodySchema = z
    .object({
        title: z
            .string()
            .min(4, { message: 'Title must be at least 4 characters.' })
            .max(100, { message: 'Title cannot exceed 100 characters.' }),
        description: z
            .string()
            .min(20, { message: 'Description must be at least 20 characters.' })
            .max(250, { message: 'Description cannot exceed 250 characters.' }),
        classroomId: z.string().uuid({ message: 'Select a valid classroom.' }).optional(),
        classroomIds: z.array(z.string().uuid({ message: 'Select a valid classroom.' })).optional(),
        classroomName: z.string().optional(),
        subjectId: z.string().uuid().optional(),
        institutionId: z.string().uuid().optional(),
        section: z.string().trim().min(1).max(100).optional(),
        sectionId: z.string().uuid().optional(),
        sectionIds: z.array(z.string().uuid()).optional(),
        roomId: z.string().uuid({ message: 'Select a valid room.' }).optional(),
        instructorId: z
            .string()
            .uuid({ message: 'Select a valid instructor.' })
            .nullable()
            .optional(),
        instructorIds: z
            .array(z.string().uuid({ message: 'Select a valid instructor.' }))
            .optional(),
        startDateTime: z.string().min(1, { message: 'Start date and time is required.' }),
        endDateTime: z.string().min(1, { message: 'End date and time is required.' }),
        durationMinutes: z
            .number()
            .min(1, { message: 'Duration is required.' })
            .max(MAX_EXAM_DURATION_MINUTES, {
                message: 'Duration cannot exceed (4 hours) 240 minutes.',
            }),
        passingScore: z
            .number()
            .int()
            .min(0, { message: 'Passing score cannot be negative.' })
            .max(100, { message: 'Passing score cannot exceed 100.' })
            .optional(),
        shuffleQuestions: z.boolean().optional(),
        showCorrectAnswers: z.boolean().optional(),
        allowReview: z.boolean().optional(),
        randomizeChoices: z.boolean().optional(),
        settings: examSettingsSchema.partial().optional(),
        configuration: examConfigurationSchema.partial().optional(),
        questionSections: z.array(examSectionInputSchema).optional(),
        questions: z.array(examQuestionInputSchema).optional(),
        examCategory: examCategorySchema.default('CLASSROOM'),
        isPublic: z.boolean().optional(),
    })
    .superRefine((values, context) => {
        const startDateTime = parseExamDateTime(values.startDateTime);
        const endDateTime = parseExamDateTime(values.endDateTime);

        if (!startDateTime) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['startDateTime'],
                message: 'Enter a valid start date and time.',
            });
        }

        if (!endDateTime) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['endDateTime'],
                message: 'Enter a valid end date and time.',
            });
        }

        if (startDateTime && endDateTime) {
            const durationMinutes = Math.round(
                (endDateTime.getTime() - startDateTime.getTime()) / 60000,
            );

            if (durationMinutes <= 0) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['endDateTime'],
                    message: 'End date and time must be after the start date and time.',
                });
            }

            if (durationMinutes > MAX_EXAM_DURATION_MINUTES) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['endDateTime'],
                    message: 'Exam duration cannot exceed 4 hours.',
                });
            }
        }

        if (values.classroomId) {
            return;
        }

        if (!values.subjectId) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['classroomId'],
                message: 'Select a classroom or subject.',
            });
            return;
        }

        const legacySectionIds = Array.from(
            new Set([values.sectionId, ...(values.sectionIds ?? [])].filter(Boolean)),
        );

        if (legacySectionIds.length > 0 && legacySectionIds.length !== 1) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['sectionIds'],
                message: 'Provide exactly one section when classroomId is not set.',
            });
        }
    });

export const updateExamBodySchema = z.object({
    institutionId: z.string().uuid().optional(),
    title: z.string().min(4).max(100).optional(),
    description: z.string().min(20).max(250).optional(),
    status: examStatusSchema.optional(),
    classroomId: z.string().uuid().nullable().optional(),
    classroomIds: z.array(z.string().uuid()).nullable().optional(),
    classroomName: z.string().trim().min(1).max(100).nullable().optional(),
    subjectId: z.string().uuid().nullable().optional(),
    sectionId: z.string().uuid().nullable().optional(),
    sectionIds: z.array(z.string().uuid()).optional(),
    roomId: z.string().uuid().nullable().optional(),
    instructorId: z.string().uuid().nullable().optional(),
    instructorIds: z.array(z.string().uuid()).nullable().optional(),
    section: z.string().trim().min(1).max(100).nullable().optional(),
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
    durationMinutes: z.number().int().min(1).max(240).optional(),
    passingScore: z.number().int().min(0).max(100).nullable().optional(),
    shuffleQuestions: nullableOptionalBooleanSchema,
    showCorrectAnswers: nullableOptionalBooleanSchema,
    allowReview: nullableOptionalBooleanSchema,
    randomizeChoices: nullableOptionalBooleanSchema,
    settings: inheritableExamSettingsUpdateSchema.nullable().optional(),
    configuration: nullableOptionalExamConfigurationUpdateSchema.optional(),
    questionSections: z.array(examSectionInputSchema).optional(),
    questions: z.array(examQuestionInputSchema).optional(),
    examCategory: examCategorySchema.optional(),
    isPublic: z.boolean().optional(),
});

export const updateExamStatusBodySchema = z.object({
    status: examStatusSchema,
});
