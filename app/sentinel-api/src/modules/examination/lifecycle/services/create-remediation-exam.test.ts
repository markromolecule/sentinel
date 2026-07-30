import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRemediationExam } from './create-remediation-exam';
import { executeTransaction, type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';

vi.mock('@sentinel/db', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/db')>('@sentinel/db');
    return {
        ...actual,
        executeTransaction: vi.fn(),
    };
});

describe('createRemediationExam', () => {
    let mockTx: any;
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockTx = {
            insertInto: vi.fn().mockReturnThis(),
            selectFrom: vi.fn().mockReturnThis(),
            selectAll: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            returningAll: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn(),
            executeTakeFirstOrThrow: vi.fn(),
            execute: vi.fn(),
        };

        mockDb = {
            selectFrom: vi.fn().mockReturnThis(),
            selectAll: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn(),
            transaction: vi.fn().mockReturnThis(),
            execute: vi.fn((callback) => callback(mockTx)),
        };

        vi.mocked(executeTransaction).mockImplementation(async (callback: any) => callback(mockTx));
    });

    it('throws 404 if source exam does not exist', async () => {
        mockDb.executeTakeFirst.mockResolvedValue(null);

        await expect(
            createRemediationExam({
                dbClient: mockDb as unknown as DbClient,
                sourceExamId: 'non-existent',
                studentId: 'student-1',
                remediationType: 'RETAKE',
                scheduledDate: '2026-07-04T10:00:00.000Z',
                endDate: '2026-07-04T12:00:00.000Z',
                createdBy: 'instructor-1',
            }),
        ).rejects.toThrow(HTTPException);
    });

    it('throws 404 if the student has no linked user account', async () => {
        mockDb.executeTakeFirst
            .mockResolvedValueOnce({
                exam_id: 'source-exam-1',
                title: 'Algorithm Design',
            })
            .mockResolvedValueOnce({
                user_id: null,
            });

        await expect(
            createRemediationExam({
                dbClient: mockDb as unknown as DbClient,
                sourceExamId: 'source-exam-1',
                studentId: 'student-record-1',
                remediationType: 'MAKEUP',
                scheduledDate: '2026-07-04T10:00:00.000Z',
                endDate: '2026-07-04T12:00:00.000Z',
                createdBy: 'instructor-1',
            }),
        ).rejects.toThrow('Student account not found.');
    });

    it('clones metadata, configurations, sections, questions and schedules remediation', async () => {
        const sourceExamMock = {
            exam_id: 'source-exam-1',
            title: 'Algorithm Design',
            subject_id: 'sub-123',
            duration_minutes: 90,
            question_count: 5,
            passing_score: 50,
            difficulty: 'HARD',
            institution_id: 'inst-1',
            exam_category: 'MAJOR',
        };

        const sourceConfigMock = {
            config_id: 'config-1',
            max_reconnect_attempts: 3,
            strict_mode: true,
            camera_required: true,
            mic_required: true,
            screen_lock: true,
        };

        const sourceSectionsMock = [{ exam_section_id: 'sec-1', title: 'Part A', order_index: 0 }];

        const sourceQuestionsMock = [
            {
                question_id: 'q-1',
                question_type: 'MULTIPLE_CHOICE',
                content: { text: 'What is O(N)?' },
                points: 10,
                order_index: 0,
                exam_section_id: 'sec-1',
            },
        ];

        // 1. Mock DB query for source exam
        mockDb.executeTakeFirst
            .mockResolvedValueOnce(sourceExamMock)
            .mockResolvedValueOnce({ user_id: 'student-user-1' });

        // 2. Mock TX queries
        mockTx.executeTakeFirst.mockResolvedValueOnce(sourceConfigMock); // configuration query
        mockTx.executeTakeFirstOrThrow.mockImplementation(async () => {
            // First returningAll call is the exam insertion
            return { exam_id: 'new-cloned-exam-id' };
        });
        mockTx.execute
            .mockResolvedValueOnce(undefined) // config insert
            .mockResolvedValueOnce(sourceSectionsMock) // sections query
            .mockResolvedValueOnce(undefined) // section insert
            .mockResolvedValueOnce(sourceQuestionsMock) // questions query
            .mockResolvedValueOnce(undefined) // question insert
            .mockResolvedValueOnce([]) // assigned sections query
            .mockResolvedValueOnce([]) // section assignments query
            .mockResolvedValueOnce({ remediation_id: 'rem-1' }); // remediation schedule insert

        const result = await createRemediationExam({
            dbClient: mockDb as unknown as DbClient,
            sourceExamId: 'source-exam-1',
            studentId: 'student-1',
            remediationType: 'RETAKE',
            scheduledDate: '2026-07-04T10:00:00.000Z',
            endDate: '2026-07-04T12:00:00.000Z',
            createdBy: 'instructor-1',
            notes: 'Cloned retake attempt.',
        });

        expect(mockDb.selectFrom).toHaveBeenCalledWith('exams');
        expect(mockTx.insertInto).toHaveBeenCalledWith('exams');
        expect(mockTx.insertInto).toHaveBeenCalledWith('exam_configurations');
        expect(mockTx.insertInto).toHaveBeenCalledWith('exam_sections');
        expect(mockTx.insertInto).toHaveBeenCalledWith('exam_questions');
        expect(mockTx.insertInto).toHaveBeenCalledWith('exam_remediation_schedules');
        expect(mockTx.values).toHaveBeenCalledWith(
            expect.objectContaining({
                student_id: 'student-user-1',
            }),
        );

        expect(result).toBeDefined();
    });
});
