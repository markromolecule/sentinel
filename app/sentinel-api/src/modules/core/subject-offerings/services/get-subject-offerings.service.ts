import { type DbClient } from '@sentinel/db';
import { getSubjectOfferingsData } from '../data/get-subject-offerings';
import { getSubjectOfferingByIdData } from '../data/get-subject-offering-by-id';
import { deleteEmptyDuplicateSubjectOfferingsData } from '../data/delete-empty-duplicate-subject-offerings';
import { mapSubjectOfferingResponse } from '../helper/map-subject-offering-response';
import {
    isMissingSubjectOfferingTableError,
    supportsSubjectOfferingTables,
} from '../helper/subject-offering-compat';
import { loadEffectiveRows } from '../../inheritance/effective-row-loader';
import { paginateItems } from '../../../../lib/pagination';
import { ensureClassGroupsForSubjectOfferings } from './class-groups-helper';

/**
 * Service to handle retrieval and query of subject offerings.
 */
export class GetSubjectOfferingsService {
    /**
     * Retrieves all subject offerings based on filter criteria, applying scope and pagination.
     *
     * @param dbClient - The database client instance.
     * @param args - The query arguments.
     * @returns A paginated list of subject offerings.
     */
    static async getSubjectOfferings(
        dbClient: DbClient,
        args: {
            institutionId?: string;
            departmentId?: string;
            courseId?: string;
            search?: string;
            subjectId?: string;
            termId?: string;
            visibility?: 'default' | 'requestable';
            instructorDepartmentId?: string;
            page?: number;
            limit?: number;
        },
    ) {
        const subjectOfferingTablesSupported = await supportsSubjectOfferingTables(dbClient);

        if (!subjectOfferingTablesSupported) {
            return [];
        }

        try {
            await ensureClassGroupsForSubjectOfferings(dbClient);
            await deleteEmptyDuplicateSubjectOfferingsData({
                dbClient,
                institutionId: args.institutionId,
            });

            const rawSubjectOfferings = await loadEffectiveRows<any>({
                institutionId: args.institutionId,
                dbClient,
                idKey: 'subject_offering_id',
                loadRows: (scopeInstitutionId) =>
                    getSubjectOfferingsData({
                        dbClient,
                        institutionId: scopeInstitutionId,
                        departmentId: args.departmentId,
                        courseId: args.courseId,
                        search: args.search,
                        subjectId: args.subjectId,
                        termId: args.termId,
                        visibility: args.visibility,
                        instructorDepartmentId: args.instructorDepartmentId,
                    }),
            });

            // Map limit back to pageSize query format locally if limit is used
            return paginateItems(
                rawSubjectOfferings.map(mapSubjectOfferingResponse),
                args.page,
                args.limit,
            );
        } catch (error) {
            if (isMissingSubjectOfferingTableError(error)) {
                return paginateItems([], args.page, args.limit);
            }

            throw error;
        }
    }

    /**
     * Retrieves a single subject offering by ID, taking institution scope inheritance into account.
     *
     * @param dbClient - The database client instance.
     * @param id - The ID of the subject offering.
     * @param institutionId - Optional institution ID context.
     * @returns The resolved subject offering response.
     */
    static async getSubjectOfferingById(dbClient: DbClient, id: string, institutionId?: string) {
        const subjectOfferingTablesSupported = await supportsSubjectOfferingTables(dbClient);

        if (subjectOfferingTablesSupported) {
            try {
                await ensureClassGroupsForSubjectOfferings(dbClient);
            } catch (e) {
                // Ignore errors related to tables or triggers during ensure
            }
        }

        if (institutionId) {
            if (subjectOfferingTablesSupported) {
                const effectiveSubjectOfferings = await loadEffectiveRows<any>({
                    institutionId,
                    dbClient,
                    idKey: 'subject_offering_id',
                    loadRows: (scopeInstitutionId) =>
                        getSubjectOfferingsData({
                            dbClient,
                            institutionId: scopeInstitutionId,
                        }),
                });
                const effectiveSubjectOffering = effectiveSubjectOfferings.find(
                    (subjectOffering: any) =>
                        subjectOffering.subject_offering_id === id ||
                        subjectOffering.sourceRecordId === id,
                );

                if (effectiveSubjectOffering) {
                    return mapSubjectOfferingResponse(effectiveSubjectOffering);
                }
            }
        }

        const subjectOffering = await getSubjectOfferingByIdData({
            dbClient,
            id,
            institutionId,
        });

        return mapSubjectOfferingResponse(subjectOffering);
    }
}
