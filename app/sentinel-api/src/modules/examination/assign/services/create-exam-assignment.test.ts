import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { createExamAssignment } from './create-exam-assignment.service';
import { findManageableExam } from '../data/find-manageable-exam';
import { findAssigneeInstructor } from '../data/find-assignee-instructor';
import { findConflictingExamAssignment } from '../data/find-conflicting-exam-assignment';
import { findExistingExamAssignment } from '../data/find-existing-exam-assignment';
import { saveExamAssignment } from '../data/save-exam-assignment';
import { ExamNotificationService } from '../../../general/notification/services/exam-notification.service';

vi.mock('../data/find-manageable-exam', () => ({
    findManageableExam: vi.fn(),
}));

vi.mock('../data/find-assignee-instructor', () => ({
    findAssigneeInstructor: vi.fn(),
}));

vi.mock('../data/find-conflicting-exam-assignment', () => ({
    findConflictingExamAssignment: vi.fn(),
}));

vi.mock('../data/find-existing-exam-assignment', () => ({
    findExistingExamAssignment: vi.fn(),
}));

vi.mock('../data/save-exam-assignment', () => ({
    saveExamAssignment: vi.fn(),
}));

vi.mock('../../../general/notification/services/exam-notification.service', () => ({
    ExamNotificationService: {
        notifyExamAssignmentCreated: vi.fn(),
    },
}));

describe('createExamAssignment', () => {
    const dbClient = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a valid exam assignment request', async () => {
        vi.mocked(findManageableExam).mockResolvedValue({
            id: 'exam-1',
            title: 'Midterm Exam',
            subjectTitle: 'Physics',
            scheduledDate: '2026-05-10T08:00:00.000Z',
            endDateTime: '2026-05-10T10:00:00.000Z',
            institutionId: 'institution-1',
            assignerName: 'Jordan Instructor',
        } as any);
        vi.mocked(findAssigneeInstructor).mockResolvedValue({
            id: 'assignee-1',
            name: 'Alex Instructor',
            institutionId: 'institution-1',
        } as any);
        vi.mocked(findConflictingExamAssignment).mockResolvedValue(undefined);
        vi.mocked(findExistingExamAssignment).mockResolvedValue(undefined);
        vi.mocked(saveExamAssignment).mockResolvedValue({
            id: 'assignment-1',
            status: 'PENDING',
            scheduledAt: '2026-05-10T08:00:00.000Z',
            createdAt: '2026-05-09T12:00:00.000Z',
            updatedAt: '2026-05-09T12:00:00.000Z',
        } as any);

        const result = await createExamAssignment({
            dbClient,
            body: {
                examId: 'exam-1',
                assigneeId: 'assignee-1',
            },
            institutionId: 'institution-1',
            userId: 'assigner-1',
        });

        expect(saveExamAssignment).toHaveBeenCalledWith({
            dbClient,
            existingAssignmentId: undefined,
            examId: 'exam-1',
            assigneeId: 'assignee-1',
            scheduledAt: '2026-05-10T08:00:00.000Z',
        });
        expect(ExamNotificationService.notifyExamAssignmentCreated).toHaveBeenCalledWith({
            dbClient,
            recipientUserId: 'assignee-1',
            actorUserId: 'assigner-1',
            institutionId: 'institution-1',
            examId: 'exam-1',
            examTitle: 'Midterm Exam',
            assignerName: 'Jordan Instructor',
        });
        expect(result).toMatchObject({
            id: 'assignment-1',
            relationship: 'OUTBOUND',
            exam: {
                id: 'exam-1',
                title: 'Midterm Exam',
                subjectTitle: 'Physics',
            },
            assignee: {
                id: 'assignee-1',
                name: 'Alex Instructor',
            },
            assigner: {
                id: 'assigner-1',
                name: 'Jordan Instructor',
            },
            status: 'PENDING',
        });
    });

    it('rejects cross-institution assignees', async () => {
        vi.mocked(findManageableExam).mockResolvedValue({
            id: 'exam-1',
            title: 'Midterm Exam',
            subjectTitle: 'Physics',
            scheduledDate: null,
            endDateTime: null,
            institutionId: 'institution-1',
            assignerName: 'Jordan Instructor',
        } as any);
        vi.mocked(findAssigneeInstructor).mockResolvedValue(undefined);

        await expect(
            createExamAssignment({
                dbClient,
                body: {
                    examId: 'exam-1',
                    assigneeId: 'assignee-2',
                },
                institutionId: 'institution-1',
                userId: 'assigner-1',
            }),
        ).rejects.toMatchObject<Partial<HTTPException>>({
            status: 404,
            message: 'Target instructor was not found in the same institution.',
        });
    });

    it('rejects duplicate active assignments', async () => {
        vi.mocked(findManageableExam).mockResolvedValue({
            id: 'exam-1',
            title: 'Midterm Exam',
            subjectTitle: 'Physics',
            scheduledDate: null,
            endDateTime: null,
            institutionId: 'institution-1',
            assignerName: 'Jordan Instructor',
        } as any);
        vi.mocked(findAssigneeInstructor).mockResolvedValue({
            id: 'assignee-1',
            name: 'Alex Instructor',
            institutionId: 'institution-1',
        } as any);
        vi.mocked(findConflictingExamAssignment).mockResolvedValue(undefined);
        vi.mocked(findExistingExamAssignment).mockResolvedValue({
            id: 'assignment-1',
            status: 'PENDING',
        } as any);

        await expect(
            createExamAssignment({
                dbClient,
                body: {
                    examId: 'exam-1',
                    assigneeId: 'assignee-1',
                },
                institutionId: 'institution-1',
                userId: 'assigner-1',
            }),
        ).rejects.toMatchObject<Partial<HTTPException>>({
            status: 409,
            message: 'This instructor already has an active assignment for the exam.',
        });
    });

    it('allows assigning an exam to multiple different instructors', async () => {
        vi.mocked(findManageableExam).mockResolvedValue({
            id: 'exam-1',
            title: 'Midterm Exam',
            subjectTitle: 'Physics',
            scheduledDate: '2026-05-10T08:00:00.000Z',
            endDateTime: '2026-05-10T10:00:00.000Z',
            institutionId: 'institution-1',
            assignerName: 'Jordan Instructor',
        } as any);
        vi.mocked(findAssigneeInstructor).mockResolvedValue({
            id: 'assignee-2',
            name: 'Taylor Instructor',
            institutionId: 'institution-1',
        } as any);
        vi.mocked(findExistingExamAssignment).mockResolvedValue(undefined);
        vi.mocked(saveExamAssignment).mockResolvedValue({
            id: 'assignment-2',
            status: 'PENDING',
            scheduledAt: '2026-05-10T08:00:00.000Z',
            createdAt: '2026-05-09T13:00:00.000Z',
            updatedAt: '2026-05-09T13:00:00.000Z',
        } as any);

        const result = await createExamAssignment({
            dbClient,
            body: {
                examId: 'exam-1',
                assigneeId: 'assignee-2',
            },
            institutionId: 'institution-1',
            userId: 'assigner-1',
        });

        expect(saveExamAssignment).toHaveBeenCalledWith({
            dbClient,
            existingAssignmentId: undefined,
            examId: 'exam-1',
            assigneeId: 'assignee-2',
            scheduledAt: '2026-05-10T08:00:00.000Z',
        });
        expect(result.id).toBe('assignment-2');
    });

    it('returns the saved assignment even when notification delivery fails', async () => {
        vi.mocked(findManageableExam).mockResolvedValue({
            id: 'exam-1',
            title: 'Midterm Exam',
            subjectTitle: 'Physics',
            scheduledDate: '2026-05-10T08:00:00.000Z',
            endDateTime: '2026-05-10T10:00:00.000Z',
            institutionId: 'institution-1',
            assignerName: 'Jordan Instructor',
        } as any);
        vi.mocked(findAssigneeInstructor).mockResolvedValue({
            id: 'assignee-1',
            name: 'Alex Instructor',
            institutionId: 'institution-1',
        } as any);
        vi.mocked(findExistingExamAssignment).mockResolvedValue(undefined);
        vi.mocked(saveExamAssignment).mockResolvedValue({
            id: 'assignment-3',
            status: 'PENDING',
            scheduledAt: '2026-05-10T08:00:00.000Z',
            createdAt: '2026-05-09T13:00:00.000Z',
            updatedAt: '2026-05-09T13:00:00.000Z',
        } as any);
        vi.mocked(ExamNotificationService.notifyExamAssignmentCreated).mockRejectedValueOnce(
            new Error('notification failed'),
        );

        const result = await createExamAssignment({
            dbClient,
            body: {
                examId: 'exam-1',
                assigneeId: 'assignee-1',
            },
            institutionId: 'institution-1',
            userId: 'assigner-1',
        });

        expect(result.id).toBe('assignment-3');
        expect(saveExamAssignment).toHaveBeenCalled();
    });
});
