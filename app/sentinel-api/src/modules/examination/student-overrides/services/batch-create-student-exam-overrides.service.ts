import type { DbClient } from '@sentinel/db';
import type { StudentExamAccessOverride } from '../student-overrides.dto';
import { createStudentExamAccessOverride } from './create-student-exam-access-override.service';

/**
 * Batch creates and persists student-specific exam access overrides for multiple students.
 */
export async function batchCreateStudentExamAccessOverrides(args: {
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
    createOverrideFn?: typeof createStudentExamAccessOverride;
}): Promise<StudentExamAccessOverride[]> {
    const createFn = args.createOverrideFn ?? createStudentExamAccessOverride;
    const results: StudentExamAccessOverride[] = [];

    for (const studentId of args.body.studentIds) {
        const override = await createFn({
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
