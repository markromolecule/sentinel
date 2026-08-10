export interface StudentClassmate {
    studentId: string;
    fullName: string;
    studentNumber: string;
    courseCode?: string;
    avatarUrl?: string | null;
}

/**
 * Filter classmates list based on search query matching full name or student number.
 *
 * @param classmates Array of student classmates.
 * @param query Search query text.
 */
export function filterClassmates(
    classmates: StudentClassmate[],
    query: string
): StudentClassmate[] {
    if (!classmates) return [];
    const trimmed = query?.trim().toLowerCase();
    if (!trimmed) return classmates;

    return classmates.filter(
        (student) =>
            student.fullName.toLowerCase().includes(trimmed) ||
            student.studentNumber.toLowerCase().includes(trimmed)
    );
}
