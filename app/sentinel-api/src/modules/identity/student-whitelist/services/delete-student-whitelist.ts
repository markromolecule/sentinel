import { type DbClient } from '@sentinel/db';
import { deleteStudentWhitelistData } from '../data/delete-student-whitelist';
import { getRequiredStudentWhitelistRecord } from '../helpers/get-required-student-whitelist-record';
import {
    verifyRequesterInstitutionAccess,
    verifyRequesterPermissions,
} from '../helpers/verify-requester-permissions';
import type { DeleteStudentWhitelistArgs } from '../student-whitelist.types';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

export async function deleteStudentWhitelist(
    dbClient: DbClient,
    { id, requesterRole, requesterInstitutionId, requesterUserId }: DeleteStudentWhitelistArgs,
) {
    verifyRequesterPermissions({
        requesterRole,
        requesterInstitutionId,
    });

    const existingRecord = await getRequiredStudentWhitelistRecord(dbClient, id);

    verifyRequesterInstitutionAccess({
        requesterRole,
        requesterInstitutionId,
        institutionId: existingRecord.institution_id,
    });

    if (existingRecord.claimed_user_id) {
        throw new Error(
            'Cannot delete a claimed whitelist record. Delete the linked student account first so the record returns to an unclaimed state.',
        );
    }

    await deleteStudentWhitelistData({
        dbClient,
        id,
        institutionId: existingRecord.institution_id,
        studentNumber: existingRecord.student_number,
    });

    await ActivityNotificationService.notifyGenericInstitutionActivity({
        dbClient,
        actorUserId: requesterUserId,
        institutionId: existingRecord.institution_id,
        operation: 'DELETED',
        targetType: 'STUDENT_WHITELIST',
        targetId: existingRecord.whitelist_id,
        targetLabel: `${existingRecord.first_name || ''} ${existingRecord.last_name} (${existingRecord.student_number})`,
        title: 'Student whitelist record deleted',
        message: `A student whitelist record was deleted for ${existingRecord.first_name || ''} ${existingRecord.last_name} (${existingRecord.student_number})`,
        sourceModule: 'student_whitelist',
        sourceAction: 'delete',
        metadata: {
            studentNumber: existingRecord.student_number,
            whitelistId: existingRecord.whitelist_id,
        },
    });
}
