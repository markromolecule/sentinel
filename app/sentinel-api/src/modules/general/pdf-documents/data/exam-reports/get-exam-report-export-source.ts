import { executeTransaction, type DbClient } from '@sentinel/db';
import { UnrecoverableError } from 'bullmq';
import { buildCompleteExamReport } from '../../../../examination/reporting/services/get-exam-report';

export type ExamReportExportSource = {
    examId: string;
    institutionId: string;
    sectionId?: string | null;
    sectionName?: string | null;
    examTitle: string;
    subjectCode: string;
    subjectName: string;
    durationMinutes: number;
    passingScore: number;
    scheduledDate: string;
    endDateTime: string;
    institutionName: string;
    generatedBy: string;
    report: any;
};

/**
 * Loads the examination report export source dataset in a single transaction.
 *
 * Verifies that the exam exists and belongs to the given institution.
 * Returns the unpaginated report and metadata.
 *
 * @param dbClient - Database client
 * @param examId - UUID of the exam
 * @param institutionId - UUID of the requesting institution
 * @param createdByUserId - UUID of the user who requested the export
 * @param sectionId - Optional UUID of specific section to filter
 * @returns Typed source data
 */
export async function getExamReportExportSource(
    dbClient: DbClient,
    examId: string,
    institutionId: string,
    createdByUserId?: string | null,
    sectionId?: string | null,
): Promise<ExamReportExportSource> {
    return await executeTransaction(async (trx) => {
        // 1. Get Exam with Institution & Subject info
        const examData = await trx
            .selectFrom('exams as e')
            .leftJoin('subjects as s', 's.subject_id', 'e.subject_id')
            .leftJoin('institutions as i', 'i.id', 'e.institution_id')
            .select([
                'e.exam_id',
                'e.title',
                'e.duration_minutes',
                'e.passing_score',
                'e.scheduled_date',
                'e.end_date_time',
                'e.institution_id',
                's.subject_code',
                's.subject_title as subject_name',
                'i.name as institution_name',
            ])
            .where('e.exam_id', '=', examId)
            .executeTakeFirst();

        if (!examData) {
            throw new UnrecoverableError(
                `Examination Results Report source: exam not found: ${examId}`,
            );
        }

        if (examData.institution_id !== institutionId) {
            throw new UnrecoverableError(
                `Examination Results Report source: exam ${examId} belongs to institution ${examData.institution_id}, not ${institutionId}`,
            );
        }

        // 2. Resolve creator user name
        let generatedBy = 'Sentinel Support';
        if (createdByUserId) {
            const userProfile = await trx
                .selectFrom('user_profiles')
                .select(['first_name', 'last_name'])
                .where('user_id', '=', createdByUserId)
                .executeTakeFirst();

            if (userProfile) {
                generatedBy = `${userProfile.first_name} ${userProfile.last_name}`.trim();
            }
        }

        // 3. Build the complete unpaginated report
        // We use 'superadmin' role here to bypass any section/assignment visibility restrictions since we are generating a complete report
        let report = await buildCompleteExamReport({
            dbClient: trx,
            examId,
            institutionId,
            viewerRole: 'superadmin',
            userId: createdByUserId,
        });

        let sectionName: string | null = null;

        if (sectionId) {
            const matchingSection = report.sections?.find((s) => s.id === sectionId);
            sectionName = matchingSection?.name ?? null;

            const filteredStudents = report.students.filter(
                (s) =>
                    s.sectionId === sectionId ||
                    (Boolean(sectionName) && s.sectionName === sectionName),
            );

            report = {
                ...report,
                students: filteredStudents,
                sections: matchingSection ? [matchingSection] : report.sections,
            };
        }

        return {
            examId: examData.exam_id,
            institutionId: examData.institution_id!,
            sectionId: sectionId ?? null,
            sectionName: sectionName ?? null,
            examTitle: examData.title,
            subjectCode: examData.subject_code ?? 'GEN-101',
            subjectName: examData.subject_name ?? 'General Course',
            durationMinutes: examData.duration_minutes ?? 60,
            passingScore: examData.passing_score ?? 50,
            scheduledDate:
                examData.scheduled_date instanceof Date
                    ? examData.scheduled_date.toISOString()
                    : (examData.scheduled_date ?? ''),
            endDateTime:
                examData.end_date_time instanceof Date
                    ? examData.end_date_time.toISOString()
                    : (examData.end_date_time ?? ''),
            institutionName: examData.institution_name ?? 'Sentinel Institution',
            generatedBy,
            report,
        };
    });
}
