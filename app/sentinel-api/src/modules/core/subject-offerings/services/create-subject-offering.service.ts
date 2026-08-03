import { type DbClient } from '@sentinel/db';
import { getSubjectRecordData } from '../data/get-subject-record';
import { getTermRecordData } from '../data/get-term-record';
import { createSubjectOfferingData } from '../data/create-subject-offering';
import { deleteSubjectOfferingData } from '../data/delete-subject-offering';
import { buildSubjectOfferingError } from '../helper/subject-offering-errors';
import { validateEffectiveInstitutionScope } from '../helper/validate-institution-scope';
import { assertSubjectOfferingAssignmentsVisible } from './assignments-visibility-helper';
import { SubjectOfferingAssignmentsService } from './subject-offering-assignments.service';
import {
    assertSubjectOfferingHasAudience,
    buildCreateSubjectOfferingValues,
    normalizeAssignments,
    type CreateSubjectOfferingPayload,
} from './subject-offering-payload.service';
import { GetSubjectOfferingsService } from './get-subject-offerings.service';

/**
 * Service to handle the creation of a single subject offering.
 */
export class CreateSubjectOfferingService {
    /**
     * Creates a subject offering, configures department/course/section assignments,
     * and sets up the corresponding class groups.
     *
     * @param dbClient - The database client instance.
     * @param data - The creation arguments payload.
     * @returns The created subject offering detail.
     */
    static async createSubjectOffering(dbClient: DbClient, data: CreateSubjectOfferingPayload) {
        const subject = await getSubjectRecordData({
            dbClient,
            subjectId: data.subject_id,
        });
        const term = await getTermRecordData({
            dbClient,
            termId: data.term_id,
        });

        if (!subject) {
            throw buildSubjectOfferingError('Subject not found', 'P2025');
        }

        if (!term) {
            throw buildSubjectOfferingError('Term not found', 'P2025');
        }

        await validateEffectiveInstitutionScope(dbClient, subject, data.institution_id, 'Subject');
        await validateEffectiveInstitutionScope(dbClient, term, data.institution_id, 'Term');
        await assertSubjectOfferingAssignmentsVisible(dbClient, data.institution_id, data);
        assertSubjectOfferingHasAudience(data);

        const createdSubjectOffering = await createSubjectOfferingData({
            dbClient,
            values: buildCreateSubjectOfferingValues({
                payload: data,
                subjectInstitutionId: subject.institution_id,
                termInstitutionId: term.institution_id,
                term,
            }),
        });

        try {
            await SubjectOfferingAssignmentsService.updateAll(
                dbClient,
                createdSubjectOffering.subject_offering_id,
                normalizeAssignments(data),
            );

            return await GetSubjectOfferingsService.getSubjectOfferingById(
                dbClient,
                createdSubjectOffering.subject_offering_id,
                data.institution_id ?? undefined,
            );
        } catch (error) {
            await deleteSubjectOfferingData(dbClient, createdSubjectOffering.subject_offering_id);
            throw error;
        }
    }
}
export { ensureClassGroupsForSubjectOfferings } from './class-groups-helper';
