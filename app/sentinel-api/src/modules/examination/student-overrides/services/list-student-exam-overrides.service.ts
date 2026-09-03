import type { DbClient } from '@sentinel/db';
import { StudentOverridesRepository } from '../data/student-overrides.repository';
import {
    compareOverrideFreshness,
    isActiveOverride,
    isPendingOrActiveOverride,
    parseOverrideRecord,
    type StoredStudentExamAccessOverride,
} from './student-overrides-helpers';

/**
 * Lists all exam-level student access overrides for an exam.
 */
export async function listExamOverrides(
    dbClient: DbClient,
    examId: string,
): Promise<StoredStudentExamAccessOverride[]> {
    const records = await StudentOverridesRepository.listExamOverrideRecords(dbClient, examId);

    return records
        .map(parseOverrideRecord)
        .filter((record): record is StoredStudentExamAccessOverride => Boolean(record));
}

/**
 * Lists overrides for a specific student and exam, newest first.
 */
export async function listStudentExamOverrides(args: {
    dbClient: DbClient;
    examId: string;
    studentId: string;
}): Promise<StoredStudentExamAccessOverride[]> {
    const records = await StudentOverridesRepository.listStudentExamOverrideRecords(
        args.dbClient,
        args.examId,
        args.studentId,
    );

    return records
        .map(parseOverrideRecord)
        .filter((record): record is StoredStudentExamAccessOverride => Boolean(record))
        .sort(compareOverrideFreshness);
}

/**
 * Returns the student's currently active override, if one is available now.
 */
export async function getActiveStudentExamOverride(args: {
    dbClient: DbClient;
    examId: string;
    studentId: string;
    now?: Date;
}): Promise<StoredStudentExamAccessOverride | null> {
    const now = args.now ?? new Date();
    const overrides = await listStudentExamOverrides(args);

    return overrides.find((override) => isActiveOverride(override, now)) ?? null;
}

/**
 * Returns the student's pending or active override, if one has not yet expired.
 */
export async function getPendingOrActiveStudentExamOverride(args: {
    dbClient: DbClient;
    examId: string;
    studentId: string;
    now?: Date;
}): Promise<StoredStudentExamAccessOverride | null> {
    const now = args.now ?? new Date();
    const overrides = await listStudentExamOverrides(args);

    return overrides.find((override) => isPendingOrActiveOverride(override, now)) ?? null;
}
