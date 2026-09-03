import type { DbClient } from '@sentinel/db';
import type { StudentExamAccessOverride } from '../student-overrides.dto';
import {
    getStudentExamOverrideKeyPrefix,
    getStudentExamOverrideSettingKey,
} from './student-overrides.keys';

export class StudentOverridesRepository {
    /**
     * Lists raw override records from system_settings for an exam.
     */
    static async listExamOverrideRecords(dbClient: DbClient, examId: string) {
        return dbClient
            .selectFrom('system_settings')
            .select(['setting_key', 'setting_value', 'created_at', 'updated_at'])
            .where('category', '=', 'examination')
            .where('setting_key', 'like', `${getStudentExamOverrideKeyPrefix(examId)}%`)
            .execute();
    }

    /**
     * Lists raw override records from system_settings for a student and exam.
     */
    static async listStudentExamOverrideRecords(
        dbClient: DbClient,
        examId: string,
        studentId: string,
    ) {
        return dbClient
            .selectFrom('system_settings')
            .select(['setting_key', 'setting_value', 'created_at', 'updated_at'])
            .where('category', '=', 'examination')
            .where('setting_key', 'like', `${getStudentExamOverrideKeyPrefix(examId, studentId)}%`)
            .execute();
    }

    /**
     * Inserts an exam access override record into system_settings.
     */
    static async insertExamOverrideRecord(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
        overrideId: string;
        overrideType: string;
        payload: StudentExamAccessOverride;
        grantedBy?: string | null;
        createdAt: Date;
    }) {
        return args.dbClient
            .insertInto('system_settings')
            .values({
                category: 'examination',
                setting_key: getStudentExamOverrideSettingKey(
                    args.examId,
                    args.studentId,
                    args.overrideId,
                ),
                setting_value: args.payload as any,
                description: `Student-specific ${args.overrideType.toLowerCase()} access override for an exam.`,
                updated_at: args.createdAt,
                updated_by: args.grantedBy ?? null,
            })
            .execute();
    }

    /**
     * Updates an exam access override setting in system_settings.
     */
    static async updateExamOverrideRecord(args: {
        dbClient: DbClient;
        settingKey: string;
        payload: StudentExamAccessOverride;
        updatedAt: Date;
        updatedBy?: string | null;
    }) {
        return args.dbClient
            .updateTable('system_settings')
            .set({
                setting_value: args.payload as any,
                updated_at: args.updatedAt,
                updated_by: args.updatedBy ?? null,
            })
            .where('setting_key', '=', args.settingKey)
            .execute();
    }

    /**
     * Fetches exam context for telemetry and notifications.
     */
    static async findExamForTelemetry(dbClient: DbClient, examId: string) {
        return dbClient
            .selectFrom('exams')
            .select(['institution_id', 'title'])
            .where('exam_id', '=', examId)
            .executeTakeFirst();
    }

    /**
     * Fetches latest attempt and configuration for reconnect override evaluation.
     */
    static async findLatestAttemptForReconnect(
        dbClient: DbClient,
        examId: string,
        studentId: string,
    ) {
        return dbClient
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
            .where('ea.exam_id', '=', examId)
            .where('ea.student_id', '=', studentId)
            .orderBy('ea.created_at', 'desc')
            .executeTakeFirst();
    }

    /**
     * Fetches latest attempt and exam context for student re-entry authorization.
     */
    static async findLatestAttemptForReentry(
        dbClient: DbClient,
        examId: string,
        studentId: string,
    ) {
        return dbClient
            .selectFrom('exam_attempts as ea')
            .leftJoin('exams as e', 'e.exam_id', 'ea.exam_id')
            .select([
                'ea.attempt_id',
                'ea.status',
                'ea.lifecycle_state',
                'ea.reconnect_attempt_count',
                'e.end_date_time',
                'e.institution_id',
            ])
            .where('ea.exam_id', '=', examId)
            .where('ea.student_id', '=', studentId)
            .orderBy('ea.created_at', 'desc')
            .executeTakeFirst();
    }

    /**
     * Updates an exam attempt state for student re-entry.
     */
    static async updateAttemptForReentry(args: {
        dbClient: DbClient;
        attemptId: string;
        reopenedUntil: Date;
        reason?: string | null;
    }) {
        return args.dbClient
            .updateTable('exam_attempts')
            .set({
                lifecycle_state: 'IN_PROGRESS',
                lifecycle_reason: 'REOPENED_BY_INSTRUCTOR',
                lifecycle_note: args.reason?.trim() || 'Re-entry authorized by instructor.',
                reconnect_attempt_count: 0,
                reopened_until: args.reopenedUntil,
                closed_at: null,
                closed_by: null,
                closed_reason: null,
            })
            .where('attempt_id', '=', args.attemptId)
            .execute();
    }

    /**
     * Updates lobby admission status for student re-entry.
     */
    static async updateLobbyAdmissionStatus(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
        status: string;
        decidedAt: Date;
        decidedBy?: string | null;
    }) {
        return args.dbClient
            .updateTable('exam_lobby_admissions')
            .set({
                status: args.status as any,
                decided_at: args.decidedAt,
                decided_by: args.decidedBy ?? null,
            })
            .where('exam_id', '=', args.examId)
            .where('student_id', '=', args.studentId)
            .execute();
    }
}
