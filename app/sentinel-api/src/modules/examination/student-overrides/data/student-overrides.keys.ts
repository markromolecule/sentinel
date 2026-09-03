export const STUDENT_EXAM_OVERRIDE_KEY_PREFIX = 'exam.student-override.';

export function getStudentExamOverrideKeyPrefix(examId: string, studentId?: string): string {
    return studentId
        ? `${STUDENT_EXAM_OVERRIDE_KEY_PREFIX}${examId}.${studentId}.`
        : `${STUDENT_EXAM_OVERRIDE_KEY_PREFIX}${examId}.`;
}

export function getStudentExamOverrideSettingKey(
    examId: string,
    studentId: string,
    overrideId: string,
): string {
    return `${getStudentExamOverrideKeyPrefix(examId, studentId)}${overrideId}`;
}
