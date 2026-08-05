import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionAssignmentsService } from './section-assignments.service';
import { createExamSectionAssignment } from './data/create-exam-section-assignment';
import { createExamSectionAssignmentsBatch } from './data/create-exam-section-assignments-batch';
import { updateExamSectionAssignment } from './data/update-exam-section-assignment';
import { deleteExamSectionAssignment } from './data/delete-exam-section-assignment';
import { syncExamAssignmentSummary } from './data/sync-exam-assignment-summary';
import { LogsService } from '../../general/logs/logs.service';
import { ExamNotificationService } from '../../general/notification/services/exam-notification.service';

vi.mock('./data/create-exam-section-assignment', () => ({
    createExamSectionAssignment: vi.fn(),
}));

vi.mock('./data/create-exam-section-assignments-batch', () => ({
    createExamSectionAssignmentsBatch: vi.fn(),
}));

vi.mock('./data/update-exam-section-assignment', () => ({
    updateExamSectionAssignment: vi.fn(),
}));

vi.mock('./data/delete-exam-section-assignment', () => ({
    deleteExamSectionAssignment: vi.fn(),
}));

vi.mock('./data/sync-exam-assignment-summary', () => ({
    syncExamAssignmentSummary: vi.fn(),
}));

vi.mock('../../general/logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn(),
    },
}));

vi.mock('../../general/notification/services/exam-notification.service', () => ({
    ExamNotificationService: {
        notifyExamAssignmentCreated: vi.fn(),
    },
}));

describe('SectionAssignmentsService', () => {
    const dbClient = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('syncs the exam row after creating a single assignment', async () => {
        vi.mocked(createExamSectionAssignment).mockResolvedValue({ id: 'assignment-1' } as any);

        await SectionAssignmentsService.createExamSectionAssignment({
            dbClient,
            examId: 'exam-1',
            body: {
                sectionId: 'section-1',
                classGroupId: 'classroom-1',
                roomId: 'room-1',
            } as any,
        });

        expect(syncExamAssignmentSummary).toHaveBeenCalledWith({
            dbClient,
            examId: 'exam-1',
        });
    });

    it('creates logs and notifications for a single assignment when actor context is provided', async () => {
        vi.mocked(createExamSectionAssignment).mockResolvedValue({ id: 'assignment-1' } as any);

        const mockDbClient = {
            selectFrom: vi.fn().mockImplementation(() => ({
                select: vi.fn().mockImplementation(() => ({
                    where: vi.fn().mockImplementation(() => ({
                        executeTakeFirst: vi.fn().mockResolvedValue({
                            title: 'Test Exam',
                            institutionId: 'institution-1',
                            fullName: 'Actor Name',
                        }),
                    })),
                })),
            })),
        } as any;

        await SectionAssignmentsService.createExamSectionAssignment({
            dbClient: mockDbClient,
            examId: 'exam-1',
            body: {
                sectionId: 'section-1',
                classGroupId: 'classroom-1',
                roomId: 'room-1',
                instructorId: 'instructor-1',
            } as any,
            actorUserId: 'actor-1',
            activeInstitutionId: 'institution-1',
        });

        expect(LogsService.createLog).toHaveBeenCalled();
        expect(ExamNotificationService.notifyExamAssignmentCreated).toHaveBeenCalled();
    });

    it('syncs the exam row after creating batch assignments', async () => {
        vi.mocked(createExamSectionAssignmentsBatch).mockResolvedValue([
            { id: 'assignment-1' },
        ] as any);

        await SectionAssignmentsService.createExamSectionAssignmentsBatch({
            dbClient,
            examId: 'exam-1',
            body: {
                assignments: [
                    {
                        sectionId: '11111111-1111-4111-8111-111111111111',
                        classGroupId: '22222222-2222-4222-8222-222222222222',
                        roomId: '33333333-3333-4333-8333-333333333333',
                        instructorId: '44444444-4444-4444-4444-444444444444',
                    },
                ],
            } as any,
        });

        expect(syncExamAssignmentSummary).toHaveBeenCalledWith({
            dbClient,
            examId: 'exam-1',
        });
    });

    it('creates logs and notifications for batch assignments when actor context is provided', async () => {
        vi.mocked(createExamSectionAssignmentsBatch).mockResolvedValue([
            {
                id: 'assignment-1',
                examId: 'exam-1',
                sectionId: 'section-1',
                classGroupId: 'classroom-1',
                roomId: 'room-1',
                instructorId: 'instructor-1',
            },
        ] as any);

        const mockDbClient = {
            selectFrom: vi.fn().mockImplementation(() => ({
                select: vi.fn().mockImplementation(() => ({
                    where: vi.fn().mockImplementation(() => ({
                        executeTakeFirst: vi.fn().mockResolvedValue({
                            title: 'Test Exam',
                            institutionId: 'institution-1',
                            fullName: 'Actor Name',
                        }),
                    })),
                })),
            })),
        } as any;

        await SectionAssignmentsService.createExamSectionAssignmentsBatch({
            dbClient: mockDbClient,
            examId: 'exam-1',
            body: {
                assignments: [
                    {
                        sectionId: 'section-1',
                        classGroupId: 'classroom-1',
                        roomId: 'room-1',
                        instructorId: 'instructor-1',
                    },
                ],
            } as any,
            actorUserId: 'actor-1',
            activeInstitutionId: 'institution-1',
        });

        expect(LogsService.createLog).toHaveBeenCalled();
        expect(ExamNotificationService.notifyExamAssignmentCreated).toHaveBeenCalled();
    });

    it('returns the saved assignment even when notification delivery fails', async () => {
        vi.mocked(createExamSectionAssignment).mockResolvedValue({ id: 'assignment-1' } as any);
        vi.mocked(ExamNotificationService.notifyExamAssignmentCreated).mockRejectedValueOnce(
            new Error('notification failed'),
        );

        const mockDbClient = {
            selectFrom: vi.fn().mockImplementation(() => ({
                select: vi.fn().mockImplementation(() => ({
                    where: vi.fn().mockImplementation(() => ({
                        executeTakeFirst: vi.fn().mockResolvedValue({
                            title: 'Test Exam',
                            institutionId: 'institution-1',
                            fullName: 'Actor Name',
                        }),
                    })),
                })),
            })),
        } as any;

        const result = await SectionAssignmentsService.createExamSectionAssignment({
            dbClient: mockDbClient,
            examId: 'exam-1',
            body: {
                sectionId: 'section-1',
                classGroupId: 'classroom-1',
                roomId: 'room-1',
                instructorId: 'instructor-1',
            } as any,
            actorUserId: 'actor-1',
            activeInstitutionId: 'institution-1',
        });

        expect(result).toEqual({ id: 'assignment-1' });
    });

    it('syncs the exam row after updating an assignment', async () => {
        vi.mocked(updateExamSectionAssignment).mockResolvedValue({ id: 'assignment-1' } as any);

        await SectionAssignmentsService.updateExamSectionAssignment({
            dbClient,
            id: 'assignment-1',
            examId: 'exam-1',
            body: {
                roomId: 'room-1',
            } as any,
        });

        expect(syncExamAssignmentSummary).toHaveBeenCalledWith({
            dbClient,
            examId: 'exam-1',
        });
    });

    it('syncs the exam row after deleting an assignment', async () => {
        vi.mocked(deleteExamSectionAssignment).mockResolvedValue('assignment-1');

        await SectionAssignmentsService.deleteExamSectionAssignment({
            dbClient,
            id: 'assignment-1',
            examId: 'exam-1',
        });

        expect(syncExamAssignmentSummary).toHaveBeenCalledWith({
            dbClient,
            examId: 'exam-1',
        });
    });
});
