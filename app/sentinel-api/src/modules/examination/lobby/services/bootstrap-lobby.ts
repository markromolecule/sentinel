import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { checkInLobby } from './check-in-lobby';
import { getLobbyCount } from './get-lobby-count';
import { getExamDetail } from '../../exams/services/get-exam-detail.service';
import { resolveLobbyRuntimeAccess } from '../../access/services/resolve-lobby-runtime-access';
import { EntitlementsRepository } from '../../access/data/entitlements.repository';
import type { ExamDetail } from '../../exams/exam.dto';
import type { ExamConfig } from '@sentinel/shared/types';
import type { ExamLobbyAdmissionStatus } from '../lobby.dto';

export interface BootstrapLobbyResult {
    exam: ExamDetail;
    configuration: ExamConfig;
    admission: {
        status: ExamLobbyAdmissionStatus;
        checkedInAt: string | null;
        decidedAt?: string | null;
    };
    waitingCount: number;
    runtimeAccess: any;
}

/**
 * Consolidated student lobby bootstrap service.
 * Performs check-in, fetches exam metadata & configuration, resolves runtime access,
 * and calculates waiting counts in parallel to minimize HTTP waterfall latency.
 */
export async function bootstrapLobby(
    dbClient: DbClient,
    examId: string,
    userId: string,
    institutionId?: string,
): Promise<BootstrapLobbyResult> {
    const student = await EntitlementsRepository.getStudentProfileByUserId(dbClient, userId);

    if (!student) {
        throw new HTTPException(404, { message: 'Student profile not found' });
    }

    const [admission, examDetail, lobbyCount] = await Promise.all([
        checkInLobby(dbClient, examId, student.student_id),
        getExamDetail(dbClient, examId, institutionId, userId),
        getLobbyCount(dbClient, examId),
    ]);

    const runtimeAccess = resolveLobbyRuntimeAccess({
        scheduledRuntimeAccess: examDetail.runtimeAccess ?? {
            canStart: false,
            canResume: false,
            state: 'lobby_waiting',
            reasonCode: 'LOBBY_WAITING',
            message: 'Waiting for admission.',
            hasActiveAttempt: false,
            startsAt: null,
            endsAt: null,
            reopenedUntil: null,
        },
        admissionStatus: admission.status,
    });

    const mergedExam: ExamDetail = {
        ...examDetail,
        runtimeAccess,
    };

    return {
        exam: mergedExam,
        configuration: examDetail.configuration,
        admission: {
            status: admission.status,
            checkedInAt: admission.checkedInAt,
        },
        waitingCount: lobbyCount.count,
        runtimeAccess,
    };
}
