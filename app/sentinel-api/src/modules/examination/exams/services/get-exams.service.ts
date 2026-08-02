import { type DbClient } from '@sentinel/db';
import type { GetExamsQuery } from '../exam.dto';
import { resolveExaminationGlobalSettings } from '../../configuration/configuration.service';
import { getExamsData } from '../data/get-exams';
import { mapExamSummaryResponse } from './map-exam-response.service';
import { applyEffectiveExamBaselineToRawRecord } from './resolve-effective-exam-baseline.service';

export async function getExams(
    dbClient: DbClient,
    filters: GetExamsQuery,
    institutionId?: string,
    studentUserId?: string,
    departmentId?: string,
    instructorUserId?: string,
) {
    const [records, globalSettings] = await Promise.all([
        getExamsData({
            dbClient,
            institutionId,
            filters,
            studentUserId,
            instructorUserId,
            departmentId,
        }),
        resolveExaminationGlobalSettings(dbClient),
    ]);

    const exams = records.map((record) =>
        mapExamSummaryResponse(applyEffectiveExamBaselineToRawRecord(record, globalSettings), {
            studentView: Boolean(studentUserId),
        }),
    );

    return exams;
}
