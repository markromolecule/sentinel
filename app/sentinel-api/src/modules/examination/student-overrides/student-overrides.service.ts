import { randomUUID } from 'node:crypto';
import { type DbClient } from '@sentinel/db';
import { Schema, type ExamRuntimeAccessType } from '@sentinel/shared';
import type {
    CreateStudentExamAccessOverrideBody,
    StudentExamAccessOverride,
} from './student-overrides.dto';
import { LogsService } from '../../general/logs/logs.service';
import { ActivityNotificationService } from '../../general/notification/services/activity-notification.service';

const STUDENT_EXAM_OVERRIDE_KEY_PREFIX = 'exam.student-override.';

type StoredStudentExamAccessOverride = StudentExamAccessOverride & {
    settingKey: string;
};

function getStudentExamOverrideKeyPrefix(examId: string, studentId?: string) {
    return studentId
        ? `${STUDENT_EXAM_OVERRIDE_KEY_PREFIX}${examId}.${studentId}.`
        : `${STUDENT_EXAM_OVERRIDE_KEY_PREFIX}${examId}.`;
}

function getStudentExamOverrideSettingKey(examId: string, studentId: string, overrideId: string) {
    return `${getStudentExamOverrideKeyPrefix(examId, studentId)}${overrideId}`;
}

function parseOverrideRecord(record: {
    setting_key: string;
    setting_value: unknown;
    created_at?: Date | string | null;
    updated_at?: Date | string | null;
}) {
    const parsed = Schema.studentExamAccessOverrideSchema.safeParse(record.setting_value);

    if (!parsed.success) {
        return null;
    }

    return {
        ...parsed.data,
        createdAt: parsed.data.createdAt ?? record.created_at ?? null,
        updatedAt: parsed.data.updatedAt ?? record.updated_at ?? null,
        settingKey: record.setting_key,
    } as StoredStudentExamAccessOverride;
}

function parseDateValue(value?: string | Date | null) {
    if (!value) {
        return null;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value?: string | Date | null) {
    const parsed = parseDateValue(value);
    return parsed ? parsed.toISOString() : null;
}

function compareOverrideFreshness(
    left: Pick<StoredStudentExamAccessOverride, 'updatedAt' | 'createdAt' | 'availableUntil'>,
    right: Pick<StoredStudentExamAccessOverride, 'updatedAt' | 'createdAt' | 'availableUntil'>,
) {
    const leftUpdatedAt =
        parseDateValue(left.updatedAt)?.getTime() ??
        parseDateValue(left.createdAt)?.getTime() ??
        parseDateValue(left.availableUntil)?.getTime() ??
        0;
    const rightUpdatedAt =
        parseDateValue(right.updatedAt)?.getTime() ??
        parseDateValue(right.createdAt)?.getTime() ??
        parseDateValue(right.availableUntil)?.getTime() ??
        0;

    return rightUpdatedAt - leftUpdatedAt;
}

function isActiveOverride(override: StudentExamAccessOverride, now: Date) {
    const availableFrom = parseDateValue(override.availableFrom);
    const availableUntil = parseDateValue(override.availableUntil);

    if (!availableFrom || !availableUntil) {
        return false;
    }

    if (override.usedAttempts >= override.allowedAttempts) {
        return false;
    }

    return availableFrom.getTime() <= now.getTime() && availableUntil.getTime() >= now.getTime();
}

function isPendingOrActiveOverride(override: StudentExamAccessOverride, now: Date) {
    const availableUntil = parseDateValue(override.availableUntil);

    if (!availableUntil) {
        return false;
    }

    if (override.usedAttempts >= override.allowedAttempts) {
        return false;
    }

    return availableUntil.getTime() >= now.getTime();
}

function normalizeSourceAttemptId(args: {
    overrideType: StudentExamAccessOverride['overrideType'];
    sourceAttemptId?: string | null;
}) {
    if (
        (args.overrideType === 'RETAKE' || args.overrideType === 'REOPEN') &&
        args.sourceAttemptId
    ) {
        return args.sourceAttemptId;
    }

    return null;
}

export function buildStudentOverrideRuntimeAccess(args: {
    accessOverride: StudentExamAccessOverride;
    runtimeAccess: ExamRuntimeAccessType;
    hasActiveAttempt?: boolean;
}): ExamRuntimeAccessType {
    const hasActiveAttempt = Boolean(args.hasActiveAttempt);
    const availableUntil = parseDateValue(args.accessOverride.availableUntil);
    const actionLabel =
        args.accessOverride.overrideType === 'MAKEUP'
            ? 'makeup'
            : args.accessOverride.overrideType === 'RETAKE'
              ? 'retake'
              : 'exam access';

    return {
        state: 'reopened',
        reasonCode: 'REOPENED',
        message: availableUntil
            ? `Your approved ${actionLabel} window is open until ${availableUntil.toLocaleString()}.`
            : `Your approved ${actionLabel} window is currently open.`,
        canStart: true,
        canResume: hasActiveAttempt,
        hasActiveAttempt,
        startsAt: args.runtimeAccess.startsAt ?? toIsoDate(args.accessOverride.availableFrom),
        endsAt: args.runtimeAccess.endsAt ?? toIsoDate(args.accessOverride.availableUntil),
        reopenedUntil: toIsoDate(args.accessOverride.availableUntil),
    };
}

export class StudentOverridesService {
    /**
     * Lists all exam-level student access overrides for an exam.
     */
    static async listExamOverrides(dbClient: DbClient, examId: string) {
        const records = await dbClient
            .selectFrom('system_settings')
            .select(['setting_key', 'setting_value', 'created_at', 'updated_at'])
            .where('category', '=', 'examination')
            .where('setting_key', 'like', `${getStudentExamOverrideKeyPrefix(examId)}%`)
            .execute();

        return records
            .map(parseOverrideRecord)
            .filter((record): record is StoredStudentExamAccessOverride => Boolean(record));
    }

    /**
     * Lists overrides for a specific student and exam, newest first.
     */
    static async listStudentExamOverrides(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
    }) {
        const records = await args.dbClient
            .selectFrom('system_settings')
            .select(['setting_key', 'setting_value', 'created_at', 'updated_at'])
            .where('category', '=', 'examination')
            .where(
                'setting_key',
                'like',
                `${getStudentExamOverrideKeyPrefix(args.examId, args.studentId)}%`,
            )
            .execute();

        return records
            .map(parseOverrideRecord)
            .filter((record): record is StoredStudentExamAccessOverride => Boolean(record))
            .sort(compareOverrideFreshness);
    }

    /**
     * Returns the student's currently active override, if one is available now.
     */
    static async getActiveStudentExamOverride(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
        now?: Date;
    }) {
        const now = args.now ?? new Date();
        const overrides = await StudentOverridesService.listStudentExamOverrides(args);

        return overrides.find((override) => isActiveOverride(override, now)) ?? null;
    }

    /**
     * Returns the student's pending or active override, if one has not yet expired.
     */
    static async getPendingOrActiveStudentExamOverride(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
        now?: Date;
    }) {
        const now = args.now ?? new Date();
        const overrides = await StudentOverridesService.listStudentExamOverrides(args);

        return overrides.find((override) => isPendingOrActiveOverride(override, now)) ?? null;
    }

    /**
     * Creates and persists a student-specific exam access override.
     */
    static async createStudentExamAccessOverride(args: {
        dbClient: DbClient;
        examId: string;
        body: CreateStudentExamAccessOverrideBody;
        grantedBy?: string | null;
    }): Promise<StudentExamAccessOverride> {
        const now = new Date();
        const overrideId = randomUUID();
        const sourceAttemptId = normalizeSourceAttemptId({
            overrideType: args.body.overrideType,
            sourceAttemptId: args.body.sourceAttemptId,
        });
        const payload: StudentExamAccessOverride = {
            id: overrideId,
            examId: args.examId,
            studentId: args.body.studentId,
            grantedBy: args.grantedBy ?? null,
            overrideType: args.body.overrideType,
            availableFrom: new Date(args.body.availableFrom).toISOString(),
            availableUntil: new Date(args.body.availableUntil).toISOString(),
            allowedAttempts: args.body.allowedAttempts ?? 1,
            usedAttempts: 0,
            usedAttemptIds: [],
            sourceAttemptId,
            notes: args.body.notes ?? null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };

        await args.dbClient
            .insertInto('system_settings')
            .values({
                category: 'examination',
                setting_key: getStudentExamOverrideSettingKey(
                    args.examId,
                    args.body.studentId,
                    overrideId,
                ),
                setting_value: payload as any,
                description: `Student-specific ${args.body.overrideType.toLowerCase()} access override for an exam.`,
                updated_at: now,
                updated_by: args.grantedBy ?? null,
            })
            .execute();

        // Telemetry logging and notifications
        try {
            const exam = await args.dbClient
                .selectFrom('exams')
                .select(['institution_id', 'title'])
                .where('exam_id', '=', args.examId)
                .executeTakeFirst();

            if (exam?.institution_id) {
                await LogsService.createLog(args.dbClient, {
                    userId: args.grantedBy ?? '00000000-0000-0000-0000-000000000000',
                    action: 'exam.override_created',
                    resourceType: 'exam_override',
                    resourceId: overrideId,
                    activeInstitutionId: exam.institution_id,
                    details: {
                        examId: args.examId,
                        studentId: args.body.studentId,
                        overrideType: args.body.overrideType,
                        allowedAttempts: args.body.allowedAttempts,
                        availableFrom: payload.availableFrom,
                        availableUntil: payload.availableUntil,
                    },
                });

                await ActivityNotificationService.notifyInstitutionActivityOverride({
                    dbClient: args.dbClient,
                    actorUserId: args.grantedBy ?? '00000000-0000-0000-0000-000000000000',
                    institutionId: exam.institution_id,
                    targetType: 'EXAM_OVERRIDE',
                    targetId: overrideId,
                    targetLabel: `${args.body.overrideType} override`,
                    title: 'Exam override granted',
                    message: `An exam override of type "${args.body.overrideType}" was granted to student for exam "${exam.title || 'Exam'}".`,
                    sourceModule: 'exams',
                    sourceAction: 'create-override',
                    metadata: {
                        examId: args.examId,
                        studentId: args.body.studentId,
                        overrideType: args.body.overrideType,
                    },
                });
            }
        } catch (logErr) {
            console.error('Failed to log or notify exam override creation:', logErr);
        }

        return payload;
    }

    /**
     * Batch creates and persists student-specific exam access overrides for multiple students.
     */
    static async batchCreateStudentExamAccessOverrides(args: {
        dbClient: DbClient;
        examId: string;
        body: {
            studentIds: string[];
            overrideType?: 'MAKEUP';
            availableFrom: string | Date;
            availableUntil: string | Date;
            allowedAttempts?: number;
            notes?: string | null;
        };
        grantedBy?: string | null;
    }): Promise<StudentExamAccessOverride[]> {
        const results: StudentExamAccessOverride[] = [];
        for (const studentId of args.body.studentIds) {
            const override = await StudentOverridesService.createStudentExamAccessOverride({
                dbClient: args.dbClient,
                examId: args.examId,
                body: {
                    studentId,
                    overrideType: args.body.overrideType ?? 'MAKEUP',
                    availableFrom: args.body.availableFrom,
                    availableUntil: args.body.availableUntil,
                    allowedAttempts: args.body.allowedAttempts ?? 1,
                    notes: args.body.notes ?? null,
                },
                grantedBy: args.grantedBy ?? null,
            });
            results.push(override);
        }
        return results;
    }

    /**
     * Grants a one-time reconnect-limit override for the student's latest

     * active attempt when the configured limit has been exhausted.
     */
    static async createReconnectLimitOverride(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
        reason?: string | null;
        grantedBy?: string | null;
        now?: Date;
    }) {
        const now = args.now ?? new Date();
        const latestAttempt = await args.dbClient
            .selectFrom('exam_attempts as ea')
            .leftJoin('exam_configurations as ec', 'ec.exam_id', 'ea.exam_id')
            .leftJoin('exams as e', 'e.exam_id', 'ea.exam_id')
            .select([
                'ea.attempt_id',
                'ea.reconnect_attempt_count',
                'ea.status',
                'ec.max_reconnect_attempts',
                'e.end_date_time',
            ])
            .where('ea.exam_id', '=', args.examId)
            .where('ea.student_id', '=', args.studentId)
            .orderBy('ea.created_at', 'desc')
            .executeTakeFirst();

        if (!latestAttempt || latestAttempt.status !== 'IN_PROGRESS') {
            throw new Error('Reconnect override requires an active in-progress attempt.');
        }

        const reconnectCount = Number(latestAttempt.reconnect_attempt_count ?? 0);
        const maxReconnectAttempts = Number(latestAttempt.max_reconnect_attempts ?? 0);

        if (reconnectCount < maxReconnectAttempts) {
            throw new Error('Reconnect limit has not been reached for this student.');
        }

        const endDateTime = parseDateValue(latestAttempt.end_date_time);
        const fallbackUntil = new Date(now.getTime() + 30 * 60_000);
        const availableUntil =
            endDateTime && endDateTime.getTime() > now.getTime() ? endDateTime : fallbackUntil;

        return StudentOverridesService.createStudentExamAccessOverride({
            dbClient: args.dbClient,
            examId: args.examId,
            body: {
                studentId: args.studentId,
                overrideType: 'REOPEN',
                availableFrom: now.toISOString(),
                availableUntil: availableUntil.toISOString(),
                allowedAttempts: 1,
                sourceAttemptId: latestAttempt.attempt_id,
                notes: args.reason?.trim() || 'Reconnect limit override granted by instructor.',
            },
            grantedBy: args.grantedBy ?? null,
        });
    }

    /**
     * Marks an override as used by the supplied attempt.
     */
    static async markOverrideUsed(args: {
        dbClient: DbClient;
        accessOverride: StudentExamAccessOverride;
        attemptId: string;
        updatedBy?: string | null;
    }) {
        const overrides = await StudentOverridesService.listStudentExamOverrides({
            dbClient: args.dbClient,
            examId: args.accessOverride.examId,
            studentId: args.accessOverride.studentId,
        });
        const storedOverride = overrides.find((override) => override.id === args.accessOverride.id);

        if (!storedOverride) {
            return null;
        }

        const now = new Date().toISOString();
        const { settingKey, ...persistedValue } = storedOverride;
        const hasUsedAttemptId = storedOverride.usedAttemptIds.includes(args.attemptId);
        const shouldIncrementAttempts =
            storedOverride.overrideType !== 'REOPEN' || !hasUsedAttemptId;
        const nextValue: StudentExamAccessOverride = {
            ...persistedValue,
            usedAttempts: shouldIncrementAttempts
                ? storedOverride.usedAttempts + 1
                : storedOverride.usedAttempts,
            usedAttemptIds: hasUsedAttemptId
                ? storedOverride.usedAttemptIds
                : [...storedOverride.usedAttemptIds, args.attemptId],
            updatedAt: now,
        };

        await args.dbClient
            .updateTable('system_settings')
            .set({
                setting_value: nextValue as any,
                updated_at: new Date(now),
                updated_by: args.updatedBy ?? null,
            })
            .where('setting_key', '=', storedOverride.settingKey)
            .execute();

        return nextValue;
    }
}
