import { type DbClient } from '@sentinel/db';
import { getSubjectOfferingBaseRecordData } from '../data/get-subject-offering-base-record';
import { getTermRecordData } from '../data/get-term-record';
import { updateSubjectOfferingData } from '../data/update-subject-offering';
import { deleteSubjectOfferingData } from '../data/delete-subject-offering';
import { buildSubjectOfferingError } from '../helper/subject-offering-errors';
import { validateEffectiveInstitutionScope } from '../helper/validate-institution-scope';
import { hideInheritedRecord } from '../../inheritance/inheritable-write-helper';
import { assertSubjectOfferingAssignmentsVisible } from './assignments-visibility-helper';
import { SubjectOfferingAssignmentsService } from './subject-offering-assignments.service';
import {
    buildUpdateSubjectOfferingValues,
    normalizeAssignments,
    type UpdateSubjectOfferingPayload,
} from './subject-offering-payload.service';
import { GetSubjectOfferingsService } from './get-subject-offerings.service';
import { SUBJECT_OFFERING_INHERITANCE_CONFIG } from './_utils';

/**
 * Service to handle updating and deleting subject offerings.
 */
export class UpdateDeleteSubjectOfferingService {
    /**
     * Updates an existing subject offering, adjusting assignments and class groups as necessary.
     *
     * @param dbClient - The database client instance.
     * @param id - The ID of the offering to update.
     * @param data - The update payload.
     * @returns The updated subject offering.
     */
    static async updateSubjectOffering(
        dbClient: DbClient,
        id: string,
        data: UpdateSubjectOfferingPayload,
    ) {
        const existingSubjectOffering = await getSubjectOfferingBaseRecordData({
            dbClient,
            id,
            institutionId: data.institution_id,
        });

        if (!existingSubjectOffering) {
            throw buildSubjectOfferingError('Subject offering not found', 'P2025');
        }

        const nextTermId = data.term_id ?? existingSubjectOffering.term_id;
        const termChanged =
            data.term_id !== undefined && data.term_id !== existingSubjectOffering.term_id;
        const term = await getTermRecordData({
            dbClient,
            termId: nextTermId,
        });

        if (!term) {
            throw buildSubjectOfferingError('Term not found', 'P2025');
        }

        await validateEffectiveInstitutionScope(dbClient, term, data.institution_id, 'Term');
        await assertSubjectOfferingAssignmentsVisible(dbClient, data.institution_id, data);

        await updateSubjectOfferingData({
            dbClient,
            id,
            values: buildUpdateSubjectOfferingValues({
                payload: data,
                nextTermId,
                term,
                existingStatus: existingSubjectOffering.status,
                termChanged,
            }),
        });

        await SubjectOfferingAssignmentsService.updatePartial(
            dbClient,
            id,
            normalizeAssignments(data),
        );

        return await GetSubjectOfferingsService.getSubjectOfferingById(
            dbClient,
            id,
            data.institution_id ?? undefined,
        );
    }

    /**
     * Deletes a subject offering by ID.
     *
     * @param dbClient - The database client instance.
     * @param id - The ID of the subject offering.
     * @param institutionId - Optional institution ID context.
     */
    static async deleteSubjectOffering(
        dbClient: DbClient,
        id: string,
        institutionId?: string | null,
        actorId?: string | null,
    ) {
        const hiddenSubjectOffering = await hideInheritedRecord({
            dbClient,
            config: SUBJECT_OFFERING_INHERITANCE_CONFIG,
            id,
            institutionId: institutionId ?? undefined,
            actorId,
        });

        if (hiddenSubjectOffering) {
            return;
        }

        const existingSubjectOffering = await getSubjectOfferingBaseRecordData({
            dbClient,
            id,
            institutionId: institutionId ?? undefined,
        });

        if (!existingSubjectOffering) {
            throw buildSubjectOfferingError('Subject offering not found', 'P2025');
        }

        await deleteSubjectOfferingData(dbClient, id, institutionId ?? undefined);
    }

    /**
     * Bulk deletes multiple subject offerings.
     *
     * @param dbClient - The database client instance.
     * @param ids - The array of offering IDs.
     * @param institutionId - Optional institution ID context.
     */
    static async deleteSubjectOfferings(
        dbClient: DbClient,
        ids: string[],
        institutionId?: string | null,
        actorId?: string | null,
    ) {
        for (const id of [...new Set(ids)]) {
            await UpdateDeleteSubjectOfferingService.deleteSubjectOffering(
                dbClient,
                id,
                institutionId,
                actorId,
            );
        }
    }
}
