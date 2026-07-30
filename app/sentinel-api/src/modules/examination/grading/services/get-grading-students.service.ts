import { type DbClient } from '@sentinel/db';
import type { GradingStudentListType, GradingStudentSectionType } from '@sentinel/shared/schema';
import { getGradingStudentsData } from '../data/get-grading-students';

export type GetGradingStudentsArgs = {
    dbClient: DbClient;
    examId: string;
    userId?: string | null;
    institutionId?: string;
    sectionId?: string;
    search?: string;
};

export async function getGradingStudents({
    dbClient,
    examId,
    userId,
    institutionId,
    sectionId,
    search,
}: GetGradingStudentsArgs): Promise<GradingStudentListType> {
    const records = await getGradingStudentsData({
        dbClient,
        examId,
        userId: userId ?? undefined,
        institutionId,
        sectionId,
        search,
    });

    const students = records
        .map((record) => {
            let status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' = 'NOT_SUBMITTED';

            if (record.completed_at) {
                if (record.score !== null && record.score !== undefined) {
                    status = 'GRADED';
                } else {
                    status = 'SUBMITTED';
                }
            }

            return {
                id: record.id,
                name: record.name ?? 'Unknown Student',
                studentId: record.studentId,
                sectionId: record.sectionId ?? null,
                sectionName: record.sectionName ?? null,
                submissionDate: record.completed_at ? record.completed_at.toISOString() : null,
                score: record.score ?? null,
                maxScore: Number(record.maxScore ?? 0),
                status,
                attemptId: record.attemptId ?? null,
            };
        })
        .sort((left, right) => left.name.localeCompare(right.name));

    const sectionMap = new Map<string, GradingStudentSectionType>();

    for (const student of students) {
        const sectionKey = student.sectionId ?? 'unassigned';
        const existingSection = sectionMap.get(sectionKey);

        if (existingSection) {
            existingSection.students.push(student);
            existingSection.totalStudents += 1;
            if (student.status !== 'NOT_SUBMITTED') {
                existingSection.submittedCount += 1;
            }
            if (student.status === 'GRADED') {
                existingSection.gradedCount += 1;
            }
            continue;
        }

        sectionMap.set(sectionKey, {
            sectionId: student.sectionId,
            sectionName: student.sectionName,
            totalStudents: 1,
            submittedCount: student.status === 'NOT_SUBMITTED' ? 0 : 1,
            gradedCount: student.status === 'GRADED' ? 1 : 0,
            students: [student],
        });
    }

    const sections = [...sectionMap.values()].sort((left, right) =>
        (left.sectionName ?? 'Unassigned Section').localeCompare(
            right.sectionName ?? 'Unassigned Section',
        ),
    );

    return {
        students,
        sections,
    };
}
