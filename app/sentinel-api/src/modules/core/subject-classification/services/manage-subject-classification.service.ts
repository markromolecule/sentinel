import { type DbClient, executeTransaction } from '@sentinel/db';
import { createSubjectClassificationData } from '../data/create-subject-classification';
import { deleteSubjectClassificationData } from '../data/delete-subject-classification';
import { getSubjectClassificationByIdData } from '../data/get-subject-classification-by-id';
import { updateSubjectClassificationSubjectsData } from '../data/update-subject-classification-subjects';
import { updateSubjectClassificationCoursesData } from '../data/update-subject-classification-courses';
import { updateSubjectClassificationData } from '../data/update-subject-classification';
import { assertSubjectsInScopeData } from '../data/assert-subjects-in-scope';
import { mapClassificationRecord } from '../helper/subject-classification-mapper';
import {
    type CreateSubjectClassificationPayload,
    type UpdateSubjectClassificationPayload,
    normalizeCreatePayload,
    normalizeUpdatePayload,
} from '../helper/subject-classification-validator';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

/**
 * Service to handle write operations (create, update, delete) for subject classifications.
 */
export class ManageSubjectClassificationService {
    /**
     * Creates a new subject classification group card and maps subjects/courses to it.
     *
     * @param dbClient - The database client instance.
     * @param data - The creation payload.
     * @returns The created subject classification.
     */
    static async createSubjectClassification(
        dbClient: DbClient,
        data: CreateSubjectClassificationPayload,
    ) {
        const payload = normalizeCreatePayload(data);
        await assertSubjectsInScopeData(dbClient, payload.subject_ids, payload.institution_id);

        return await executeTransaction(async (trx) => {
            const createdClassification = await createSubjectClassificationData({
                dbClient: trx,
                values: {
                    name: payload.name,
                    classification_type: payload.type,
                    description: payload.description,
                    department_id: payload.department_id,
                    year_levels: payload.year_levels,
                    created_by: payload.created_by,
                    institution_id: payload.institution_id,
                },
            });

            await updateSubjectClassificationSubjectsData({
                dbClient: trx,
                subjectClassificationId: createdClassification.subject_classification_id,
                subjectIds: payload.subject_ids,
            });

            await updateSubjectClassificationCoursesData({
                dbClient: trx,
                subjectClassificationId: createdClassification.subject_classification_id,
                courseIds: payload.course_ids,
            });

            const record = await getSubjectClassificationByIdData({
                dbClient: trx,
                id: createdClassification.subject_classification_id,
                institutionId: payload.institution_id ?? undefined,
            });

            const classification = mapClassificationRecord(record);

            if (payload.created_by && payload.institution_id) {
                await ActivityNotificationService.notifySubjectClassificationCreated({
                    dbClient: trx,
                    actorUserId: payload.created_by,
                    institutionId: payload.institution_id,
                    classificationId: classification.subject_classification_id,
                    classificationLabel: classification.name,
                });
            }

            return classification;
        });
    }

    /**
     * Updates an existing subject classification group card details and assignments.
     *
     * @param dbClient - The database client instance.
     * @param id - The ID of the classification to update.
     * @param data - The update payload.
     * @param institutionId - Optional institution ID context.
     * @returns The updated subject classification.
     */
    static async updateSubjectClassification(
        dbClient: DbClient,
        id: string,
        data: UpdateSubjectClassificationPayload,
        institutionId?: string,
    ) {
        const payload = normalizeUpdatePayload(data);

        if (payload.subject_ids) {
            await assertSubjectsInScopeData(dbClient, payload.subject_ids, institutionId);
        }

        return await executeTransaction(async (trx) => {
            await updateSubjectClassificationData({
                dbClient: trx,
                id,
                institutionId,
                values: {
                    ...(payload.name !== undefined ? { name: payload.name } : {}),
                    ...(payload.type !== undefined ? { classification_type: payload.type } : {}),
                    ...(payload.description !== undefined
                        ? { description: payload.description }
                        : {}),
                    ...(payload.department_id !== undefined
                        ? { department_id: payload.department_id }
                        : {}),
                    ...(payload.year_levels !== undefined
                        ? { year_levels: payload.year_levels }
                        : {}),
                    ...(payload.updated_by !== undefined ? { updated_by: payload.updated_by } : {}),
                    updated_at: new Date(),
                },
            });

            if (payload.subject_ids !== undefined) {
                await updateSubjectClassificationSubjectsData({
                    dbClient: trx,
                    subjectClassificationId: id,
                    subjectIds: payload.subject_ids,
                });
            }

            if (payload.course_ids !== undefined) {
                await updateSubjectClassificationCoursesData({
                    dbClient: trx,
                    subjectClassificationId: id,
                    courseIds: payload.course_ids,
                });
            }

            const record = await getSubjectClassificationByIdData({
                dbClient: trx,
                id,
                institutionId,
            });

            const classification = mapClassificationRecord(record);

            if (payload.updated_by && institutionId) {
                await ActivityNotificationService.notifySubjectClassificationUpdated({
                    dbClient: trx,
                    actorUserId: payload.updated_by,
                    institutionId,
                    classificationId: classification.subject_classification_id,
                    classificationLabel: classification.name,
                });
            }

            return classification;
        });
    }

    /**
     * Deletes a subject classification group card.
     *
     * @param dbClient - The database client instance.
     * @param id - The ID of the classification to delete.
     * @param institutionId - Optional institution ID context.
     * @param actorUserId - Optional actor user ID.
     * @returns The deleted classification record.
     */
    static async deleteSubjectClassification(
        dbClient: DbClient,
        id: string,
        institutionId?: string,
        actorUserId?: string,
    ) {
        const deletedClassification = await deleteSubjectClassificationData({
            dbClient,
            id,
            institutionId,
        });

        if (institutionId && actorUserId) {
            await ActivityNotificationService.notifySubjectClassificationDeleted({
                dbClient,
                actorUserId,
                institutionId,
                classificationId: deletedClassification.subject_classification_id,
                classificationLabel: deletedClassification.name,
            });
        }

        return deletedClassification;
    }
}
