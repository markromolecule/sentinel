import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAdmissions } from './update-admissions';
import { NotificationService } from '../../../general/notification/notification.service';

vi.mock('../../../general/notification/notification.service', () => ({
    NotificationService: {
        createNotification: vi.fn(),
    },
}));

describe('updateAdmissions', () => {
    let mockDbClient: any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates approved notification for student and returns updatedCount', async () => {
        const mockExecuteTakeFirst = vi.fn();
        mockExecuteTakeFirst
            .mockResolvedValueOnce({ numUpdatedRows: 1n })
            .mockResolvedValueOnce({ institution_id: 'inst-123', title: 'Final Exam' })
            .mockResolvedValueOnce({ user_id: 'user-stud-1' });

        mockDbClient = {
            updateTable: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            selectFrom: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst,
        } as any;

        const result = await updateAdmissions(
            mockDbClient,
            'exam-123',
            ['student-1'],
            'APPROVED',
            'instructor-456',
        );

        expect(result).toEqual({ updatedCount: 1 });
        expect(NotificationService.createNotification).toHaveBeenCalledWith({
            dbClient: mockDbClient,
            recipientUserId: 'user-stud-1',
            actorUserId: 'instructor-456',
            institutionId: 'inst-123',
            title: 'Exam lobby approved',
            message: 'You have been admitted to exam "Final Exam".',
            actionType: 'INSTITUTION_ACTIVITY_UPDATED',
            resourceType: 'EXAM_ASSIGNMENT',
            resourceId: 'exam-123',
            resourceLabel: 'Final Exam',
            metadata: {
                examId: 'exam-123',
                status: 'APPROVED',
            },
        });
    });

    it('creates rejected notification for student', async () => {
        const mockExecuteTakeFirst = vi.fn();
        mockExecuteTakeFirst
            .mockResolvedValueOnce({ numUpdatedRows: 1n })
            .mockResolvedValueOnce({ institution_id: 'inst-123', title: 'Final Exam' })
            .mockResolvedValueOnce({ user_id: 'user-stud-1' });

        mockDbClient = {
            updateTable: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            selectFrom: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst,
        } as any;

        await updateAdmissions(
            mockDbClient,
            'exam-123',
            ['student-1'],
            'REJECTED',
            'instructor-456',
        );

        expect(NotificationService.createNotification).toHaveBeenCalledWith({
            dbClient: mockDbClient,
            recipientUserId: 'user-stud-1',
            actorUserId: 'instructor-456',
            institutionId: 'inst-123',
            title: 'Exam lobby rejected',
            message: 'Your request to enter exam "Final Exam" was declined.',
            actionType: 'INSTITUTION_ACTIVITY_UPDATED',
            resourceType: 'EXAM_ASSIGNMENT',
            resourceId: 'exam-123',
            resourceLabel: 'Final Exam',
            metadata: {
                examId: 'exam-123',
                status: 'REJECTED',
            },
        });
    });

    it('skips notification if student user profile is not found', async () => {
        const mockExecuteTakeFirst = vi.fn();
        mockExecuteTakeFirst
            .mockResolvedValueOnce({ numUpdatedRows: 1n })
            .mockResolvedValueOnce({ institution_id: 'inst-123', title: 'Final Exam' })
            .mockResolvedValueOnce(null);

        mockDbClient = {
            updateTable: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            selectFrom: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst,
        } as any;

        const result = await updateAdmissions(
            mockDbClient,
            'exam-123',
            ['student-1'],
            'APPROVED',
            'instructor-456',
        );

        expect(result).toEqual({ updatedCount: 1 });
        expect(NotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('isolates notification creation failure from update result', async () => {
        const mockExecuteTakeFirst = vi.fn();
        mockExecuteTakeFirst
            .mockResolvedValueOnce({ numUpdatedRows: 2n })
            .mockResolvedValueOnce({ institution_id: 'inst-123', title: 'Final Exam' })
            .mockResolvedValueOnce({ user_id: 'user-stud-1' });

        mockDbClient = {
            updateTable: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            selectFrom: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst,
        } as any;

        vi.mocked(NotificationService.createNotification).mockRejectedValueOnce(
            new Error('Notification DB error'),
        );

        const result = await updateAdmissions(
            mockDbClient,
            'exam-123',
            ['student-1'],
            'APPROVED',
            'instructor-456',
        );

        expect(result).toEqual({ updatedCount: 2 });
    });
});
