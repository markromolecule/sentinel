import { type DbClient } from '@sentinel/db';
import { isInstitutionAllowed } from '../evidence.constants';
import { HTTPException } from 'hono/http-exception';

export interface StudentUploadAuthorization {
    attemptId: string;
    studentId: string;
    institutionId: string;
    examId: string;
}

/**
 * Service to authorize evidence-related operations.
 * Validates request scopes, attempt eligibility, AI rules, and allowlists.
 */
export class EvidenceAuthorizationService {
    /**
     * Authorizes a student to upload evidence for a given attempt.
     * Ensures:
     * - The attempt exists and is IN_PROGRESS.
     * - The student owns the attempt.
     * - The student's institution is allowlisted.
     * - The corresponding AI proctoring rule is enabled for the exam.
     */
    static async authorizeStudentUpload(
        db: DbClient,
        attemptId: string,
        studentUserId: string,
        eventType: string,
    ): Promise<StudentUploadAuthorization> {
        const attempt = await db
            .selectFrom('exam_attempts as ea')
            .innerJoin('students as s', 's.student_id', 'ea.student_id')
            .innerJoin('exams as e', 'e.exam_id', 'ea.exam_id')
            .leftJoin('exam_configurations as ec', 'ec.exam_id', 'e.exam_id')
            .select([
                'ea.attempt_id',
                's.student_id as student_id',
                'e.exam_id as exam_id',
                'ea.lifecycle_state',
                's.user_id as student_user_id',
                'e.institution_id',
                'ec.ai_rules',
            ])
            .where('ea.attempt_id', '=', attemptId)
            .executeTakeFirst();

        if (!attempt) {
            throw new HTTPException(404, { message: 'Exam attempt not found' });
        }

        if (attempt.student_user_id !== studentUserId) {
            throw new HTTPException(403, { message: 'Unauthorized attempt access' });
        }

        if (attempt.lifecycle_state !== 'IN_PROGRESS') {
            throw new HTTPException(400, {
                message: 'Evidence upload is only permitted for in-progress attempts.',
            });
        }

        const institutionId = attempt.institution_id;
        if (!institutionId || !isInstitutionAllowed(institutionId)) {
            throw new HTTPException(403, {
                message: 'Evidence storage is not enabled for this institution.',
            });
        }

        // Validate corresponding AI proctoring rule is enabled
        const aiRules = attempt.ai_rules ? (attempt.ai_rules as any) : {};
        let isRuleEnabled = false;

        if (eventType === 'FACE_NOT_VISIBLE') {
            isRuleEnabled = aiRules.face_detection === true;
        } else if (eventType === 'MULTIPLE_FACES') {
            isRuleEnabled = aiRules.multiple_faces_detection === true;
        } else if (eventType === 'GAZE') {
            isRuleEnabled = aiRules.gaze_tracking === true;
        } else {
            throw new HTTPException(400, {
                message: `Unsupported evidence event type: ${eventType}`,
            });
        }

        if (!isRuleEnabled) {
            throw new HTTPException(400, {
                message: `AI proctoring rule for event type ${eventType} is disabled.`,
            });
        }

        return {
            attemptId: attempt.attempt_id,
            studentId: attempt.student_id,
            institutionId,
            examId: attempt.exam_id,
        };
    }
}
