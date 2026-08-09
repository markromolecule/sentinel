/**
 * Helper to build navigation paths for classroom child pages.
 *
 * @param id Classroom / Subject ID.
 */
export function getClassroomExamsRoute(id: string): string {
    if (!id) return '';
    return `/classroom/${id}/exams`;
}

/**
 * Helper to build navigation paths for classroom classmates.
 *
 * @param id Classroom / Subject ID.
 */
export function getClassroomClassmatesRoute(id: string): string {
    if (!id) return '';
    return `/classroom/${id}/classmates`;
}
