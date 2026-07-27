import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteExam, deleteExamForCleanup } from './delete-exam.service';
import { deleteExamData } from '../data/delete-exam';
import { getExamByIdData } from '../data/get-exam-by-id';
import { requireExamRecord } from './require-exam-record.service';
import { assertExamOwnership } from './assert-exam-ownership.service';
import { EvidenceDeletionService } from '../../../telemetry/evidence/services/evidence-deletion.service';

vi.mock('../data/delete-exam', () => ({
    deleteExamData: vi.fn(),
}));

vi.mock('../data/get-exam-by-id', () => ({
    getExamByIdData: vi.fn(),
}));

vi.mock('./require-exam-record.service', () => ({
    requireExamRecord: vi.fn((value) => value),
}));

vi.mock('./assert-exam-ownership.service', () => ({
    assertExamOwnership: vi.fn(),
}));

vi.mock('../../../telemetry/evidence/services/evidence-deletion.service', () => ({
    EvidenceDeletionService: {
        deleteEvidenceForSystemCleanup: vi.fn(),
    },
}));

vi.mock('../../../general/logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn(),
    },
}));

vi.mock('../../../core/rooms/services/recalculate-room-status', () => ({
    recalculateRoomStatus: vi.fn(),
}));

vi.mock('../../../general/pdf-documents/storage/pdf-storage.service', () => ({
    PdfStorageService: {
        deletePdf: vi.fn(),
    },
}));

function createMockDb() {
    const attempts = [{ attempt_id: 'attempt-1' }];
    const evidence = [{ evidence_id: 'evidence-1' }];
    const answerKeyExports: any[] = [];

    return {
        selectFrom: vi.fn((table: string) => {
            const query: any = {
                select: vi.fn(() => query),
                where: vi.fn(() => query),
                execute: vi.fn(async () => {
                    if (table === 'exam_attempts') {
                        return attempts;
                    }
                    if (table === 'telemetry_incident_evidence') {
                        return evidence;
                    }
                    if (table === 'exam_answer_key_exports') {
                        return answerKeyExports;
                    }
                    return [];
                }),
            };

            return query;
        }),
    };
}

describe('delete exam evidence cleanup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(deleteExamData).mockResolvedValue({
            exam_id: 'exam-1',
            room_id: null,
        });
        vi.mocked(getExamByIdData).mockResolvedValue({
            exam_id: 'exam-1',
            room_id: null,
            created_by: 'owner-1',
        } as any);
    });

    it('cleans evidence before deleting an exam in cleanup mode', async () => {
        const db = createMockDb() as any;

        await deleteExamForCleanup(db, 'exam-1', 'institution-1');

        expect(EvidenceDeletionService.deleteEvidenceForSystemCleanup).toHaveBeenCalledWith(db, {
            evidenceId: 'evidence-1',
            deletionReason: 'ATTEMPT_DELETED',
        });
        expect(deleteExamData).toHaveBeenCalledWith({
            dbClient: db,
            id: 'exam-1',
            institutionId: 'institution-1',
        });
    });

    it('blocks exam deletion when evidence cleanup fails', async () => {
        const db = createMockDb() as any;
        vi.mocked(EvidenceDeletionService.deleteEvidenceForSystemCleanup).mockRejectedValueOnce(
            new Error('storage failure'),
        );

        await expect(deleteExam(db, 'exam-1', 'institution-1', 'owner-1')).rejects.toThrow(
            'storage failure',
        );

        expect(assertExamOwnership).toHaveBeenCalled();
        expect(deleteExamData).not.toHaveBeenCalled();
    });
});
