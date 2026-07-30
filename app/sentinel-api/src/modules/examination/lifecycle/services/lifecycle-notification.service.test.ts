import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    notifyAttemptLifecycleStudent,
    notifyAttemptLifecycleInstructor,
    LifecycleNotificationService,
} from './lifecycle-notification.service';
import { NotificationService } from '../../../general/notification/notification.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

vi.mock('../../../general/notification/notification.service', () => ({
    NotificationService: {
        createNotification: vi.fn(),
    },
}));

vi.mock('../../../general/notification/services/activity-notification.service', () => ({
    ActivityNotificationService: {
        notifyInstitutionActivityCreated: vi.fn(),
    },
}));

describe('LifecycleNotificationService', () => {
    let mockDbClient: any;
    let lastTable = '';

    beforeEach(() => {
        vi.clearAllMocks();
        lastTable = '';

        mockDbClient = {
            selectFrom: vi.fn().mockImplementation((table) => {
                lastTable = table;
                return mockDbClient;
            }),
            leftJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockImplementation(() => {
                if (lastTable === 'students as s') {
                    return Promise.resolve({
                        userId: 'user-stud-99',
                        firstName: 'Alice',
                        lastName: 'Smith',
                    });
                }
                if (lastTable === 'exams') {
                    return Promise.resolve({
                        title: 'Midterm Physics',
                        institution_id: 'inst-123',
                    });
                }
                return Promise.resolve(null);
            }),
        } as any;
    });

    describe('notifyAttemptLifecycleStudent', () => {
        it('resolves student user_id, maps started event, and creates student notification', async () => {
            await notifyAttemptLifecycleStudent({
                dbClient: mockDbClient,
                examId: 'exam-123',
                studentId: 'student-99',
                attemptId: 'attempt-456',
                eventType: 'STARTED',
                actorUserId: 'instructor-456',
            });

            expect(NotificationService.createNotification).toHaveBeenCalledWith({
                dbClient: mockDbClient,
                recipientUserId: 'user-stud-99',
                actorUserId: 'instructor-456',
                institutionId: 'inst-123',
                title: 'Exam Attempt Started',
                message: 'Your attempt for "Midterm Physics" has started.',
                actionType: 'INSTITUTION_ACTIVITY_CREATED',
                resourceType: 'INSTITUTION_ACTIVITY',
                resourceId: 'attempt-456',
                resourceLabel: 'Midterm Physics',
                metadata: {
                    attemptId: 'attempt-456',
                    examId: 'exam-123',
                    studentId: 'student-99',
                    eventType: 'STARTED',
                },
            });
        });

        it('supports explicit institutionId override', async () => {
            await notifyAttemptLifecycleStudent({
                dbClient: mockDbClient,
                examId: 'exam-123',
                studentId: 'student-99',
                attemptId: 'attempt-456',
                eventType: 'STARTED',
                actorUserId: 'instructor-456',
                institutionId: 'override-inst-456',
            });

            expect(NotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    institutionId: 'override-inst-456',
                }),
            );
        });

        it('returns null if student profile is missing', async () => {
            mockDbClient.executeTakeFirst.mockImplementation(() => {
                if (lastTable === 'students as s') {
                    return Promise.resolve(null);
                }
                if (lastTable === 'exams') {
                    return Promise.resolve({
                        title: 'Midterm Physics',
                        institution_id: 'inst-123',
                    });
                }
                return Promise.resolve(null);
            });

            const result = await notifyAttemptLifecycleStudent({
                dbClient: mockDbClient,
                examId: 'exam-123',
                studentId: 'student-99',
                eventType: 'STARTED',
            });

            expect(result).toBeNull();
            expect(NotificationService.createNotification).not.toHaveBeenCalled();
        });

        it('maps AUTOMATIC_CLOSE event successfully', async () => {
            await notifyAttemptLifecycleStudent({
                dbClient: mockDbClient,
                examId: 'exam-123',
                studentId: 'student-99',
                attemptId: 'attempt-456',
                eventType: 'AUTOMATIC_CLOSE',
            });

            expect(NotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Exam Attempt Automatically Closed',
                    message:
                        'Your attempt for "Midterm Physics" has been automatically closed due to proctoring policy.',
                }),
            );
        });
    });

    describe('notifyAttemptLifecycleInstructor', () => {
        it('creates instructor notification through ActivityNotificationService', async () => {
            await notifyAttemptLifecycleInstructor({
                dbClient: mockDbClient,
                examId: 'exam-123',
                studentId: 'student-99',
                attemptId: 'attempt-456',
                eventType: 'SUBMITTED',
            });

            expect(
                ActivityNotificationService.notifyInstitutionActivityCreated,
            ).toHaveBeenCalledWith({
                dbClient: mockDbClient,
                actorUserId: '00000000-0000-0000-0000-000000000000',
                institutionId: 'inst-123',
                targetType: 'EXAM_ATTEMPT',
                targetId: 'attempt-456',
                targetLabel: 'Midterm Physics',
                title: 'Student Exam Attempt Submitted',
                message: 'Alice Smith\'s attempt for "Midterm Physics" has been submitted.',
                sourceModule: 'exams',
                sourceAction: 'attempt-submitted',
                metadata: {
                    attemptId: 'attempt-456',
                    examId: 'exam-123',
                    studentId: 'student-99',
                    studentName: 'Alice Smith',
                    eventType: 'SUBMITTED',
                },
            });
        });
    });

    describe('LifecycleNotificationService.notifyLifecycleChange', () => {
        it('calls student and instructor notify methods in parallel', async () => {
            await LifecycleNotificationService.notifyLifecycleChange({
                dbClient: mockDbClient,
                examId: 'exam-123',
                studentId: 'student-99',
                attemptId: 'attempt-456',
                eventType: 'RESET',
            });

            expect(NotificationService.createNotification).toHaveBeenCalled();
            expect(ActivityNotificationService.notifyInstitutionActivityCreated).toHaveBeenCalled();
        });
    });
});
