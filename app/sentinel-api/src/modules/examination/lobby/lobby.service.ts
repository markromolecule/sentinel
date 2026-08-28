import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { AssessmentAllowedRole } from '../assessment/assessment-access';
import { EntitlementsRepository } from '../access/data/entitlements.repository';
import { assertInstructorExamAccess } from '../assign/services/exam-access.service';
import { getMonitoringExamContext } from '../monitoring/services/get-monitoring-exam-context';
import type { LobbyAdmissionDecisionStatus } from './lobby.dto';
import { bootstrapLobby } from './services/bootstrap-lobby';
import { checkInLobby } from './services/check-in-lobby';
import { getAdmissionStatus } from './services/get-admission-status';
import { getLobbyCount } from './services/get-lobby-count';
import { getWaitingList } from './services/get-waiting-list';
import { updateAdmissions } from './services/update-admissions';
import { LogsService } from '../../general/logs/logs.service';

async function resolveStudentId(dbClient: DbClient, userId: string) {
    const student = await EntitlementsRepository.getStudentProfileByUserId(dbClient, userId);

    if (!student) {
        throw new HTTPException(404, { message: 'Student profile not found' });
    }

    return student.student_id;
}

async function assertLobbyExamAccess(args: {
    dbClient: DbClient;
    examId: string;
    userId: string;
    institutionId?: string;
    role: AssessmentAllowedRole;
}) {
    const { dbClient, examId, userId, institutionId, role } = args;

    await getMonitoringExamContext({
        dbClient,
        examId,
        institutionId,
        viewerRole: role,
        userId,
    });
}

export class LobbyService {
    static async bootstrap(
        dbClient: DbClient,
        examId: string,
        userId: string,
        institutionId?: string,
    ) {
        return await bootstrapLobby(dbClient, examId, userId, institutionId);
    }

    static async checkIn(dbClient: DbClient, examId: string, userId: string) {
        const studentId = await resolveStudentId(dbClient, userId);
        const result = await checkInLobby(dbClient, examId, studentId);

        // Telemetry logging
        try {
            const student = await EntitlementsRepository.getStudentProfileByUserId(
                dbClient,
                userId,
            );
            if (student?.institution_id) {
                await LogsService.createLog(dbClient, {
                    userId,
                    action: 'exam.lobby_checked_in',
                    resourceType: 'exam_lobby',
                    resourceId: examId,
                    activeInstitutionId: student.institution_id,
                    details: { examId, studentId },
                });
            }
        } catch (logErr) {
            console.error('Failed to log exam.lobby_checked_in:', logErr);
        }

        return result;
    }

    static async getAdmissionStatus(dbClient: DbClient, examId: string, userId: string) {
        const studentId = await resolveStudentId(dbClient, userId);

        return await getAdmissionStatus(dbClient, examId, studentId);
    }

    static async getLobbyCount(
        dbClient: DbClient,
        examId: string,
        userId?: string,
        institutionId?: string,
        role?: string | null,
    ) {
        if (userId && role !== 'student') {
            const student = await EntitlementsRepository.getStudentProfileByUserId(
                dbClient,
                userId,
            );

            if (student) {
                return await getLobbyCount(dbClient, examId);
            }

            await assertInstructorExamAccess({
                dbClient,
                examId,
                userId,
                institutionId,
            });
        }

        return await getLobbyCount(dbClient, examId);
    }

    static async getWaitingList(
        dbClient: DbClient,
        examId: string,
        userId: string,
        role: AssessmentAllowedRole,
        institutionId?: string,
    ) {
        await assertLobbyExamAccess({
            dbClient,
            examId,
            userId,
            institutionId,
            role,
        });

        return await getWaitingList(dbClient, examId);
    }

    static async updateAdmissions(
        dbClient: DbClient,
        examId: string,
        studentIds: string[],
        status: LobbyAdmissionDecisionStatus,
        instructorId: string,
        role: AssessmentAllowedRole,
        institutionId?: string,
    ) {
        await assertLobbyExamAccess({
            dbClient,
            examId,
            userId: instructorId,
            institutionId,
            role,
        });

        const result = await updateAdmissions(dbClient, examId, studentIds, status, instructorId);

        // Telemetry logging
        try {
            const instId =
                institutionId ||
                (
                    await dbClient
                        .selectFrom('exams')
                        .select(['institution_id'])
                        .where('exam_id', '=', examId)
                        .executeTakeFirst()
                )?.institution_id;
            if (instId) {
                await LogsService.createLog(dbClient, {
                    userId: instructorId,
                    action: status === 'APPROVED' ? 'exam.lobby_admitted' : 'exam.lobby_rejected',
                    resourceType: 'exam_lobby',
                    resourceId: examId,
                    activeInstitutionId: instId,
                    details: { examId, studentIds, status },
                });
            }
        } catch (logErr) {
            console.error('Failed to log lobby admissions updates:', logErr);
        }

        return result;
    }
}
