import { type DbClient, executeTransaction } from '@sentinel/db';
import { getTermRecordData } from '../data/get-term-record';
import { getSubjectRecordsByIdsData } from '../data/get-subject-records-by-ids';
import { getExistingSubjectOfferingsBySubjectsData } from '../data/get-existing-subject-offerings-by-subjects';
import { createSubjectOfferingsData } from '../data/create-subject-offering';
import { buildSubjectOfferingError } from '../helper/subject-offering-errors';
import { validateEffectiveInstitutionScope } from '../helper/validate-institution-scope';
import { assertSubjectOfferingAssignmentsVisible } from './assignments-visibility-helper';
import { SubjectOfferingAssignmentsService } from './subject-offering-assignments.service';
import { SubjectClassificationService } from '../../subject-classification/subject-classification.service';
import {
    assertSubjectOfferingHasAudience,
    buildCreateSubjectOfferingValues,
    normalizeAssignments,
} from './subject-offering-payload.service';
import { GetSubjectOfferingsService } from './get-subject-offerings.service';

type BulkSubjectOfferingPayload = {
    subject_classification_id: string;
    term_id: string;
    department_ids?: string[];
    course_ids?: string[];
    section_ids?: string[];
    year_levels?: number[];
    duplicate_strategy?: 'skip_existing' | 'fail_existing';
    created_by?: string | null;
    institution_id?: string | null;
};

type ClassificationSubjectForOffering = {
    id: string;
    code: string;
    title: string;
};

function isClassificationSubjectForOffering(
    value: unknown,
): value is ClassificationSubjectForOffering {
    return (
        Boolean(value) &&
        typeof value === 'object' &&
        typeof (value as ClassificationSubjectForOffering).id === 'string' &&
        typeof (value as ClassificationSubjectForOffering).code === 'string' &&
        typeof (value as ClassificationSubjectForOffering).title === 'string'
    );
}

/**
 * Service to handle bulk creation of subject offerings from a classification card.
 */
export class CreateSubjectOfferingsFromClassificationService {
    /**
     * Creates term offerings in bulk for all subjects assigned to the specified classification.
     *
     * @param dbClient - The database client instance.
     * @param data - The bulk creation parameters.
     * @returns A summary of created and skipped offering items.
     */
    static async createSubjectOfferingsFromClassification(
        dbClient: DbClient,
        data: BulkSubjectOfferingPayload,
    ) {
        const duplicateStrategy = data.duplicate_strategy ?? 'skip_existing';
        const classification = await SubjectClassificationService.getSubjectClassification(
            dbClient,
            data.subject_classification_id,
            data.institution_id ?? undefined,
        );

        if (!classification) {
            throw buildSubjectOfferingError('Subject classification not found', 'P2025');
        }

        const classificationSubjects: ClassificationSubjectForOffering[] = Array.isArray(
            classification.subjects,
        )
            ? classification.subjects.filter(isClassificationSubjectForOffering)
            : [];
        const subjectIds = classificationSubjects
            .map((subject) => subject.id)
            .filter((subjectId): subjectId is string => Boolean(subjectId));

        if (subjectIds.length === 0) {
            throw buildSubjectOfferingError(
                'Subject classification has no assigned subjects',
                'EMPTY_SUBJECT_CLASSIFICATION',
            );
        }

        const term = await getTermRecordData({
            dbClient,
            termId: data.term_id,
        });

        if (!term) {
            throw buildSubjectOfferingError('Term not found', 'P2025');
        }

        await validateEffectiveInstitutionScope(dbClient, term, data.institution_id, 'Term');
        await assertSubjectOfferingAssignmentsVisible(dbClient, data.institution_id, data);
        assertSubjectOfferingHasAudience(data);

        const existingOfferings = await getExistingSubjectOfferingsBySubjectsData({
            dbClient,
            subjectIds,
            termId: data.term_id,
            institutionId: data.institution_id,
        });
        const existingOfferingBySubjectId = new Map(
            existingOfferings.map((offering) => [offering.subject_id, offering]),
        );

        if (existingOfferings.length > 0 && duplicateStrategy === 'fail_existing') {
            throw buildSubjectOfferingError(
                'One or more subjects are already offered for the selected term',
                'P2002',
            );
        }

        const skipped = classificationSubjects
            .map((subject) => {
                const existingOffering = existingOfferingBySubjectId.get(subject.id);

                if (!existingOffering) {
                    return null;
                }

                return {
                    subject_id: subject.id,
                    subject_code: subject.code,
                    subject_title: subject.title,
                    existing_subject_offering_id: existingOffering.subject_offering_id,
                    reason: 'already_offered' as const,
                };
            })
            .filter((subject): subject is NonNullable<typeof subject> => subject !== null);

        const subjectsToCreate = classificationSubjects.filter(
            (subject) => !existingOfferingBySubjectId.has(subject.id),
        );

        const subjectRecords = await getSubjectRecordsByIdsData({
            dbClient,
            subjectIds: subjectsToCreate.map((subject) => subject.id),
        });
        const subjectRecordById = new Map(
            subjectRecords.map((subjectRecord) => [subjectRecord.subject_id, subjectRecord]),
        );

        const subjectOfferingValues = await Promise.all(
            subjectsToCreate.map(async (subject) => {
                const subjectRecord = subjectRecordById.get(subject.id);

                if (!subjectRecord) {
                    throw buildSubjectOfferingError('Subject not found', 'P2025');
                }

                await validateEffectiveInstitutionScope(
                    dbClient,
                    subjectRecord,
                    data.institution_id,
                    'Subject',
                );

                return buildCreateSubjectOfferingValues({
                    payload: {
                        subject_id: subject.id,
                        term_id: data.term_id,
                        department_ids: data.department_ids,
                        course_ids: data.course_ids,
                        section_ids: data.section_ids,
                        year_levels: data.year_levels,
                        created_by: data.created_by,
                        institution_id: data.institution_id,
                    },
                    subjectInstitutionId: subjectRecord.institution_id,
                    termInstitutionId: term.institution_id,
                    term,
                });
            }),
        );

        const createdSubjectOfferings = await executeTransaction(async (trx) => {
            const createdRecords = await createSubjectOfferingsData({
                dbClient: trx,
                values: subjectOfferingValues,
            });
            const assignments = normalizeAssignments(data);

            await SubjectOfferingAssignmentsService.createAllForOfferings(
                trx,
                createdRecords.map((record) => record.subject_offering_id),
                assignments,
            );

            await Promise.all(
                skipped.map((skippedOffering) =>
                    SubjectOfferingAssignmentsService.updateAll(
                        trx,
                        skippedOffering.existing_subject_offering_id,
                        assignments,
                    ),
                ),
            );

            return createdRecords;
        });

        const created = await Promise.all(
            createdSubjectOfferings.map((createdSubjectOffering) =>
                GetSubjectOfferingsService.getSubjectOfferingById(
                    dbClient,
                    createdSubjectOffering.subject_offering_id,
                    data.institution_id ?? undefined,
                ),
            ),
        );

        return {
            classification_id: classification.id ?? classification.subject_classification_id,
            classification_name: classification.name,
            term_id: data.term_id,
            created_count: created.length,
            skipped_count: skipped.length,
            total_subject_count: classificationSubjects.length,
            duplicate_strategy: duplicateStrategy,
            created,
            skipped,
        };
    }
}
