import { HTTPException } from 'hono/http-exception';
import { type DbClient } from '@sentinel/db';
import type { CreateExamAssignmentBody } from '../assign.dto';
import { findAssigneeInstructor } from '../data/find-assignee-instructor';
import { findConflictingExamAssignment } from '../data/find-conflicting-exam-assignment';
import { findExistingExamAssignment } from '../data/find-existing-exam-assignment';
import { findManageableExam } from '../data/find-manageable-exam';
import { saveExamAssignment } from '../data/save-exam-assignment';
import { ExamNotificationService } from '../../../general/notification/services/exam-notification.service';
import { mapExamAssignment } from './map-exam-assignment';
import { LogsService } from '../../../general/logs/logs.service';

const BLOCKING_ASSIGNMENT_STATUSES = new Set(['PENDING', 'ACCEPTED', 'ACTIVE', 'SCHEDULED']);

export async function createExamAssignment(args: {
    dbClient: DbClient;
    body: CreateExamAssignmentBody;
    institutionId?: string;
    userId: string;
}) {
    const { dbClient, body, institutionId, userId } = args;

    const exam = await findManageableExam({
        dbClient,
        examId: body.examId,
        userId,
        institutionId,
    });

    if (!exam) {
        throw new HTTPException(404, {
            message: 'Exam not found or you do not have access to assign it.',
        });
    }

    if (body.assigneeId === userId) {
        throw new HTTPException(400, {
            message: 'You cannot assign an exam to yourself.',
        });
    }

    const assignee = await findAssigneeInstructor({
        dbClient,
        assigneeId: body.assigneeId,
        institutionId: exam.institutionId ?? institutionId,
    });

    if (!assignee) {
        throw new HTTPException(404, {
            message: 'Target instructor was not found in the same institution.',
        });
    }

    // Allow multiple instructors to be assigned to the same exam.
    // The existingAssignment check below still prevents assigning the SAME instructor multiple times.

    const existingAssignment = await findExistingExamAssignment({
        dbClient,
        examId: body.examId,
        assigneeId: body.assigneeId,
    });

    if (existingAssignment?.status && BLOCKING_ASSIGNMENT_STATUSES.has(existingAssignment.status)) {
        throw new HTTPException(409, {
            message: 'This instructor already has an active assignment for the exam.',
        });
    }

    const savedAssignment = await saveExamAssignment({
        dbClient,
        existingAssignmentId: existingAssignment?.id,
        examId: body.examId,
        assigneeId: body.assigneeId,
        scheduledAt: exam.scheduledDate ?? null,
    });

    try {
        await ExamNotificationService.notifyExamAssignmentCreated({
            dbClient,
            recipientUserId: assignee.id!,
            actorUserId: userId,
            institutionId: exam.institutionId ?? institutionId,
            examId: exam.id,
            examTitle: exam.title,
            assignerName: exam.assignerName,
        });
    } catch (notifErr) {
        console.error('Failed to send exam assignment notification:', {
            examId: exam.id,
            assigneeId: assignee.id,
            userId,
            institutionId: exam.institutionId ?? institutionId ?? null,
            notifErr,
        });
    }

    // Telemetry logging
    try {
        const activeInstitutionId = exam.institutionId ?? institutionId;
        if (activeInstitutionId) {
            await LogsService.createLog(dbClient, {
                userId,
                action: 'exam.assignment_created',
                resourceType: 'exam_assignment',
                resourceId: savedAssignment.id,
                activeInstitutionId,
                details: {
                    examId: body.examId,
                    assigneeId: body.assigneeId,
                },
            });
        }
    } catch (logErr) {
        console.error('Failed to log exam.assignment_created:', logErr);
    }

    return mapExamAssignment({
        id: savedAssignment.id,
        relationship: 'OUTBOUND',
        exam: {
            id: exam.id,
            title: exam.title,
            subjectTitle: exam.subjectTitle ?? null,
            scheduledDate: exam.scheduledDate ?? null,
            endDateTime: exam.endDateTime ?? null,
        },
        assigner: {
            id: userId,
            name: exam.assignerName,
        },
        assignee: {
            id: assignee.id!,
            name: assignee.name,
        },
        status: savedAssignment.status ?? 'PENDING',
        scheduledAt: savedAssignment.scheduledAt ?? null,
        createdAt: savedAssignment.createdAt ?? null,
        updatedAt: savedAssignment.updatedAt ?? null,
    });
}
