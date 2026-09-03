import { type DbClient } from '@sentinel/db';
import type {
    CreateStudentExamAccessOverrideBody,
    StudentExamAccessOverride,
} from './student-overrides.dto';
import type { StoredStudentExamAccessOverride } from './services/student-overrides-helpers';
import { buildStudentOverrideRuntimeAccess } from './services/build-student-override-runtime-access.service';
import {
    listExamOverrides,
    listStudentExamOverrides,
    getActiveStudentExamOverride,
    getPendingOrActiveStudentExamOverride,
} from './services/list-student-exam-overrides.service';
import { createStudentExamAccessOverride } from './services/create-student-exam-access-override.service';
import { batchCreateStudentExamAccessOverrides } from './services/batch-create-student-exam-overrides.service';
import { createReconnectLimitOverride } from './services/create-reconnect-limit-override.service';
import { markOverrideUsed } from './services/mark-override-used.service';
import { authorizeStudentReentry } from './services/authorize-student-reentry.service';

export { buildStudentOverrideRuntimeAccess };
export type { StoredStudentExamAccessOverride };

export class StudentOverridesService {
    /**
     * Lists all exam-level student access overrides for an exam.
     */
    static async listExamOverrides(
        dbClient: DbClient,
        examId: string,
    ): Promise<StoredStudentExamAccessOverride[]> {
        return listExamOverrides(dbClient, examId);
    }

    /**
     * Lists overrides for a specific student and exam, newest first.
     */
    static async listStudentExamOverrides(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
    }): Promise<StoredStudentExamAccessOverride[]> {
        return listStudentExamOverrides(args);
    }

    /**
     * Returns the student's currently active override, if one is available now.
     */
    static async getActiveStudentExamOverride(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
        now?: Date;
    }): Promise<StoredStudentExamAccessOverride | null> {
        return getActiveStudentExamOverride(args);
    }

    /**
     * Returns the student's pending or active override, if one has not yet expired.
     */
    static async getPendingOrActiveStudentExamOverride(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
        now?: Date;
    }): Promise<StoredStudentExamAccessOverride | null> {
        return getPendingOrActiveStudentExamOverride(args);
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
        return createStudentExamAccessOverride(args);
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
        return batchCreateStudentExamAccessOverrides({
            ...args,
            createOverrideFn: (overrideArgs) =>
                StudentOverridesService.createStudentExamAccessOverride(overrideArgs),
        });
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
    }): Promise<StudentExamAccessOverride> {
        return createReconnectLimitOverride({
            ...args,
            createOverrideFn: (overrideArgs) =>
                StudentOverridesService.createStudentExamAccessOverride(overrideArgs),
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
    }): Promise<StudentExamAccessOverride | null> {
        return markOverrideUsed(args);
    }

    /**
     * Authorizes student re-entry by unlocking active/closed attempt, resetting
     * reconnect_attempt_count to 0, approving lobby admission, and broadcasting real-time event.
     */
    static async authorizeStudentReentry(args: {
        dbClient: DbClient;
        examId: string;
        studentId: string;
        reason?: string | null;
        actorUserId?: string | null;
        institutionId?: string;
        now?: Date;
    }) {
        return authorizeStudentReentry(args);
    }
}
