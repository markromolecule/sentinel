import { type DbClient } from '@sentinel/db';
import { GetSubjectOfferingsService } from './services/get-subject-offerings.service';
import { CreateSubjectOfferingService } from './services/create-subject-offering.service';
import { CreateSubjectOfferingsFromClassificationService } from './services/create-subject-offerings-from-classification.service';
import { UpdateDeleteSubjectOfferingService } from './services/update-delete-subject-offering.service';
import {
    type CreateSubjectOfferingPayload,
    type UpdateSubjectOfferingPayload,
} from './services/subject-offering-payload.service';

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

/**
 * Service facade to orchestrate subject offering catalog operations.
 */
export class SubjectOfferingsService {
    /**
     * Retrieves all subject offerings based on filter criteria, applying scope and pagination.
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
        return GetSubjectOfferingsService.getSubjectOfferings(dbClient, args);
    }

    /**
     * Retrieves a single subject offering by ID.
     */
    static async getSubjectOfferingById(dbClient: DbClient, id: string, institutionId?: string) {
        return GetSubjectOfferingsService.getSubjectOfferingById(dbClient, id, institutionId);
    }

    /**
     * Creates a subject offering.
     */
    static async createSubjectOffering(dbClient: DbClient, data: CreateSubjectOfferingPayload) {
        return CreateSubjectOfferingService.createSubjectOffering(dbClient, data);
    }

    /**
     * Creates term offerings in bulk for all subjects assigned to a classification.
     */
    static async createSubjectOfferingsFromClassification(
        dbClient: DbClient,
        data: BulkSubjectOfferingPayload,
    ) {
        return CreateSubjectOfferingsFromClassificationService.createSubjectOfferingsFromClassification(
            dbClient,
            data,
        );
    }

    /**
     * Updates an existing subject offering.
     */
    static async updateSubjectOffering(
        dbClient: DbClient,
        id: string,
        data: UpdateSubjectOfferingPayload,
    ) {
        return UpdateDeleteSubjectOfferingService.updateSubjectOffering(dbClient, id, data);
    }

    /**
     * Deletes a subject offering by ID.
     */
    static async deleteSubjectOffering(
        dbClient: DbClient,
        id: string,
        institutionId?: string | null,
        actorId?: string | null,
    ) {
        return UpdateDeleteSubjectOfferingService.deleteSubjectOffering(
            dbClient,
            id,
            institutionId,
            actorId,
        );
    }

    /**
     * Bulk deletes multiple subject offerings.
     */
    static async deleteSubjectOfferings(
        dbClient: DbClient,
        ids: string[],
        institutionId?: string | null,
        actorId?: string | null,
    ) {
        return UpdateDeleteSubjectOfferingService.deleteSubjectOfferings(
            dbClient,
            ids,
            institutionId,
            actorId,
        );
    }
}
export { ensureClassGroupsForSubjectOfferings } from './services/class-groups-helper';
