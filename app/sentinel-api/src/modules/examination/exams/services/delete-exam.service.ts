import { type DbClient } from '@sentinel/db';
import { getExamByIdData } from '../data/get-exam-by-id';
import { requireExamRecord } from './require-exam-record.service';
import { LogsService } from '../../../general/logs/logs.service';
import { recalculateRoomStatus } from '../../../core/rooms/services/recalculate-room-status';
import { assertExamOwnership } from './assert-exam-ownership.service';
import { type DeleteExamDataResponse, deleteExamData } from '../data/delete-exam';
import { PdfStorageService } from '../../../general/pdf-documents/storage/pdf-storage.service';
import { EvidenceDeletionService } from '../../../telemetry/evidence/services/evidence-deletion.service';

async function cleanupExamEvidence(dbClient: DbClient, examId: string) {
    const attempts = await dbClient
        .selectFrom('exam_attempts')
        .select(['attempt_id'])
        .where('exam_id', '=', examId)
        .execute();

    if (attempts.length === 0) {
        return;
    }

    const attemptIds = attempts.map((attempt) => attempt.attempt_id);
    const evidenceRows = await dbClient
        .selectFrom('telemetry_incident_evidence')
        .select(['evidence_id'])
        .where('attempt_id', 'in', attemptIds)
        .where('state', 'not in', ['DELETED', 'EXPIRED'])
        .execute();

    for (const evidence of evidenceRows) {
        await EvidenceDeletionService.deleteEvidenceForSystemCleanup(dbClient, {
            evidenceId: evidence.evidence_id,
            deletionReason: 'ATTEMPT_DELETED',
        });
    }
}

async function finalizeDeletedExam(
    dbClient: DbClient,
    deletedRecord: DeleteExamDataResponse,
    institutionId?: string,
) {
    if (deletedRecord.room_id) {
        await recalculateRoomStatus(dbClient, deletedRecord.room_id);
    }

    // Purge private answer-key storage objects before DB cascade removes the records
    try {
        const answerKeyExports = await dbClient
            .selectFrom('exam_answer_key_exports')
            .select(['export_id', 'storage_bucket', 'storage_path'])
            .where('exam_id', '=', deletedRecord.exam_id)
            .execute();

        for (const ake of answerKeyExports) {
            if (ake.storage_bucket && ake.storage_path) {
                try {
                    await PdfStorageService.deletePdf(ake.storage_bucket, ake.storage_path);
                } catch (storageErr: any) {
                    console.warn(
                        `[ExamDelete] Storage cleanup failed for answer key ${ake.export_id}:`,
                        storageErr.message,
                    );
                }
            }
        }
    } catch (cleanupErr: any) {
        console.warn(
            `[ExamDelete] Answer key storage cleanup failed for exam ${deletedRecord.exam_id}:`,
            cleanupErr.message,
        );
    }

    if (institutionId) {
        try {
            await LogsService.createLog(dbClient, {
                action: 'exam.delete',
                resourceType: 'exam',
                resourceId: deletedRecord.exam_id,
                activeInstitutionId: institutionId,
                details: { exam_id: deletedRecord.exam_id },
            });
        } catch (logErr) {
            console.error('Failed to log exam.delete event:', logErr);
        }
    }
}

/**
 * Deletes an exam without running ownership checks. Intended for internal
 * cleanup flows such as classroom deletion where access has already been
 * authorized at the parent resource level.
 */
export async function deleteExamForCleanup(dbClient: DbClient, id: string, institutionId?: string) {
    await cleanupExamEvidence(dbClient, id);
    const deletedRecord = await deleteExamData({
        dbClient,
        id,
        institutionId,
    });

    const record = requireExamRecord(deletedRecord);
    await finalizeDeletedExam(dbClient, record, institutionId);
}

/**
 * Deletes an exam after confirming the caller owns it or can bypass ownership.
 */
export async function deleteExam(
    dbClient: DbClient,
    id: string,
    institutionId: string | undefined,
    userId: string,
    canManageExam = false,
    role?: string,
) {
    const current = requireExamRecord(
        await getExamByIdData({
            dbClient,
            id,
            institutionId,
        }),
    );
    assertExamOwnership(current.created_by, userId, canManageExam, role);
    await cleanupExamEvidence(dbClient, id);

    const deletedRecord = await deleteExamData({
        dbClient,
        id,
        institutionId,
    });

    const record = requireExamRecord(deletedRecord);
    await finalizeDeletedExam(dbClient, record, institutionId);
}
