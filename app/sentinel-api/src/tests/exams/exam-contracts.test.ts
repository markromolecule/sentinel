import { HTTPException } from 'hono/http-exception';
import { describe, expect, it } from 'vitest';
import { createExamSchema, updateExamSchema } from '../../modules/examination/exams/exam.dto';
import { assertExamScheduleWindow } from '../../modules/examination/exams/services/assert-exam-schedule-window.service';
import { mapExamSummaryResponse } from '../../modules/examination/exams/services/map-exam-response.service';
import { assertExamStructureInput } from '../../modules/examination/exams/services/assert-exam-structure-input.service';
import { resolveExamStatus } from '../../modules/examination/exams/services/resolve-exam-status.service';
import {
    checkInLobbySchema,
    getAdmissionStatusSchema,
    getWaitingListSchema,
    updateAdmissionsSchema,
} from '../../modules/examination/lobby/lobby.dto';

describe('exam contracts', () => {
    it('rejects create payloads with a non-uuid subject id', () => {
        const result = createExamSchema.body.safeParse({
            title: 'Midterm Exam',
            description: 'This is a valid exam description for backend validation.',
            subjectId: 'CS101',
            section: 'BSCS-3A',
            startDateTime: '2026-04-03T09:00:00.000Z',
            endDateTime: '2026-04-03T10:00:00.000Z',
            durationMinutes: 60,
            passingScore: 60,
            shuffleQuestions: false,
            showCorrectAnswers: false,
            allowReview: true,
            randomizeChoices: false,
        });

        expect(result.success).toBe(false);
    });

    it('accepts create payloads that target a single section through sectionIds', () => {
        const result = createExamSchema.body.safeParse({
            title: 'Midterm Exam',
            description: 'This is a valid exam description for backend validation.',
            subjectId: '11111111-1111-4111-8111-111111111111',
            sectionIds: ['22222222-2222-4222-8222-222222222222'],
            startDateTime: '2026-04-03T09:00:00.000Z',
            endDateTime: '2026-04-03T10:00:00.000Z',
            durationMinutes: 60,
            passingScore: 60,
            shuffleQuestions: false,
            showCorrectAnswers: false,
            allowReview: true,
            randomizeChoices: false,
        });

        expect(result.success).toBe(true);
    });

    it('accepts update payloads that replace the exam assignment with multiple sections', () => {
        const result = updateExamSchema.body.safeParse({
            title: 'Updated Midterm Exam',
            sectionIds: [
                '22222222-2222-4222-8222-222222222222',
                '33333333-3333-4333-8333-333333333333',
            ],
            roomId: null,
            section: null,
            durationMinutes: 90,
        });

        expect(result.success).toBe(true);
    });

    it('accepts create payloads that expand a classroom assignment with explicit extra sections', () => {
        const result = createExamSchema.body.safeParse({
            title: 'Expanded Midterm Exam',
            description: 'This exam targets multiple explicit sections for the same subject.',
            classroomId: '11111111-1111-4111-8111-111111111111',
            sectionIds: [
                '22222222-2222-4222-8222-222222222222',
                '33333333-3333-4333-8333-333333333333',
            ],
            startDateTime: '2026-04-03T09:00:00.000Z',
            endDateTime: '2026-04-03T10:00:00.000Z',
            durationMinutes: 60,
            passingScore: 60,
            shuffleQuestions: false,
            showCorrectAnswers: false,
            allowReview: true,
            randomizeChoices: false,
        });

        expect(result.success).toBe(true);
    });

    it('accepts section descriptions in exam structure payloads', () => {
        const result = updateExamSchema.body.safeParse({
            questionSections: [
                {
                    id: 'ec6bf415-e2cf-4e80-abcc-1ddc94214706',
                    title: 'Part I',
                    description: 'Answer each item using complete sentences.',
                    orderIndex: 0,
                },
                {
                    id: '31699215-76b1-4d55-b38f-8772638b7751',
                    title: 'Part II',
                    description: null,
                    orderIndex: 1,
                },
            ],
        });

        expect(result.success).toBe(true);
        expect(result.data?.questionSections?.[0]?.description).toBe(
            'Answer each item using complete sentences.',
        );
        expect(result.data?.questionSections?.[1]?.description).toBeNull();
    });

    it('accepts a valid exam schedule window', () => {
        expect(() =>
            assertExamScheduleWindow({
                startDateTime: '2026-04-03T09:00:00.000Z',
                endDateTime: '2026-04-03T10:30:00.000Z',
            }),
        ).not.toThrow();
    });

    it('rejects an exam schedule that ends before it starts', () => {
        expect(() =>
            assertExamScheduleWindow({
                startDateTime: '2026-04-03T10:30:00.000Z',
                endDateTime: '2026-04-03T09:00:00.000Z',
            }),
        ).toThrowError(HTTPException);
    });

    it('rejects an exam schedule longer than four hours', () => {
        expect(() =>
            assertExamScheduleWindow({
                startDateTime: '2026-04-03T08:00:00.000Z',
                endDateTime: '2026-04-03T12:30:00.000Z',
            }),
        ).toThrowError(HTTPException);
    });

    it('rejects duplicate section order indexes in the submitted exam structure', () => {
        expect(() =>
            assertExamStructureInput({
                questionSections: [
                    {
                        id: 'ec6bf415-e2cf-4e80-abcc-1ddc94214706',
                        title: 'Part I',
                        orderIndex: 0,
                    },
                    {
                        id: '31699215-76b1-4d55-b38f-8772638b7751',
                        title: 'Part II',
                        orderIndex: 0,
                    },
                ],
            }),
        ).toThrowError(HTTPException);
    });

    it('rejects duplicate question ids in the submitted exam structure', () => {
        expect(() =>
            assertExamStructureInput({
                questions: [
                    {
                        id: '1f6e1d10-b508-4590-b9ff-20878b5b03c4',
                        sectionId: null,
                        sourceQuestionBankQuestionId: null,
                        type: 'MULTIPLE_CHOICE',
                        points: 1,
                        orderIndex: 0,
                        content: {
                            prompt: 'Question 1',
                            options: ['A', 'B'],
                            correctAnswer: 'A',
                        },
                    },
                    {
                        id: '1f6e1d10-b508-4590-b9ff-20878b5b03c4',
                        sectionId: null,
                        sourceQuestionBankQuestionId: null,
                        type: 'TRUE_FALSE',
                        points: 1,
                        orderIndex: 1,
                        content: {
                            prompt: 'Question 2',
                            correctAnswer: true,
                        },
                    },
                ],
            }),
        ).toThrowError(HTTPException);
    });

    it('resolves published exams as archived after the scheduled end time', () => {
        expect(
            resolveExamStatus({
                status: 'PUBLISHED',
                scheduledDate: '2026-04-03T09:00:00.000Z',
                endDateTime: '2026-04-03T10:00:00.000Z',
                now: new Date('2026-04-03T10:00:01.000Z'),
            }),
        ).toBe('archived');
    });

    it('keeps draft exams as draft even after the scheduled end time', () => {
        expect(
            resolveExamStatus({
                status: 'DRAFT',
                scheduledDate: '2026-04-03T09:00:00.000Z',
                endDateTime: '2026-04-03T10:00:00.000Z',
                now: new Date('2026-04-03T10:00:01.000Z'),
            }),
        ).toBe('draft');
    });

    it('archives published exams using scheduled date plus duration when end time is missing', () => {
        expect(
            resolveExamStatus({
                status: 'PUBLISHED',
                scheduledDate: '2026-04-03T09:00:00.000Z',
                durationMinutes: 60,
                now: new Date('2026-04-03T10:00:01.000Z'),
            }),
        ).toBe('archived');
    });

    it('maps legacy single-section exam records into the multi-section response shape', () => {
        const response = mapExamSummaryResponse({
            exam_id: '11111111-1111-1111-1111-111111111111',
            title: 'Legacy Exam',
            description: 'Legacy description',
            duration_minutes: 60,
            passing_score: 60,
            status: 'PUBLISHED',
            subject_id: '22222222-2222-2222-2222-222222222222',
            subject_title: 'Mathematics',
            section_id: '33333333-3333-3333-3333-333333333333',
            assigned_section_ids: null,
            section_name: 'BSCS 3A',
            room_id: null,
            room_name: null,
            scheduled_date: '2026-04-03T09:00:00.000Z',
            end_date_time: '2026-04-03T10:00:00.000Z',
            published_at: '2026-04-02T09:00:00.000Z',
            question_count: 20,
            created_at: '2026-04-01T09:00:00.000Z',
            updated_at: '2026-04-02T09:00:00.000Z',
        });

        expect(response.sectionId).toBe('33333333-3333-3333-3333-333333333333');
        expect(response.sectionIds).toEqual(['33333333-3333-3333-3333-333333333333']);
        expect(response.sectionName).toBe('BSCS 3A');
    });

    // Phase 6 – Lobby admission DTO contracts

    it('validates a well-formed check-in response against the lobby check-in schema', () => {
        const result = checkInLobbySchema.response.safeParse({
            message: 'Successfully checked in to the exam lobby.',
            data: {
                status: 'WAITING',
                checkedInAt: '2026-04-20T10:00:00.000Z',
            },
        });

        expect(result.success).toBe(true);
    });

    it('rejects a check-in response with an invalid admission status', () => {
        const result = checkInLobbySchema.response.safeParse({
            message: 'Checked in.',
            data: {
                status: 'PENDING', // not a valid LobbyAdmissionStatus
                checkedInAt: '2026-04-20T10:00:00.000Z',
            },
        });

        expect(result.success).toBe(false);
    });

    it('validates a null-status admission poll response when the student has not checked in yet', () => {
        const result = getAdmissionStatusSchema.response.safeParse({
            message: 'Admission status retrieved.',
            data: {
                status: null,
                checkedInAt: null,
                decidedAt: null,
            },
        });

        expect(result.success).toBe(true);
    });

    it('validates an approved admission status in the poll response', () => {
        const result = getAdmissionStatusSchema.response.safeParse({
            message: 'Admission status retrieved.',
            data: {
                status: 'APPROVED',
                checkedInAt: '2026-04-20T10:00:00.000Z',
                decidedAt: '2026-04-20T10:02:00.000Z',
            },
        });

        expect(result.success).toBe(true);
    });

    it('validates a waiting-list response with multiple students', () => {
        const result = getWaitingListSchema.response.safeParse({
            message: 'Waiting list retrieved.',
            data: [
                {
                    admissionId: '11111111-1111-4111-8111-111111111111',
                    studentId: '22222222-2222-4222-8222-222222222222',
                    studentName: 'Maria Santos',
                    studentNumber: '2021-00001',
                    status: 'WAITING',
                    checkedInAt: '2026-04-20T10:00:00.000Z',
                    decidedAt: null,
                    hasActiveAttempt: false,
                    attemptStatus: null,
                    reconnectCount: 0,
                    maxReconnectAttempts: 3,
                },
                {
                    admissionId: '33333333-3333-4333-8333-333333333333',
                    studentId: '44444444-4444-4444-8444-444444444444',
                    studentName: 'Juan dela Cruz',
                    studentNumber: null,
                    status: 'APPROVED',
                    checkedInAt: '2026-04-20T10:01:00.000Z',
                    decidedAt: '2026-04-20T10:03:00.000Z',
                    hasActiveAttempt: true,
                    attemptStatus: 'IN_PROGRESS',
                    reconnectCount: 0,
                    maxReconnectAttempts: 3,
                },
            ],
        });

        expect(result.success).toBe(true);
    });

    it('rejects a waiting-list item that omits maxReconnectAttempts', () => {
        const result = getWaitingListSchema.response.safeParse({
            message: 'Waiting list retrieved.',
            data: [
                {
                    admissionId: '11111111-1111-4111-8111-111111111111',
                    studentId: '22222222-2222-4222-8222-222222222222',
                    studentName: 'Maria Santos',
                    studentNumber: '2021-00001',
                    status: 'WAITING',
                    checkedInAt: '2026-04-20T10:00:00.000Z',
                    decidedAt: null,
                    hasActiveAttempt: false,
                    attemptStatus: null,
                    reconnectCount: 0,
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    it('validates a bulk-admit update body with a valid student id list and APPROVED status', () => {
        const result = updateAdmissionsSchema.body.safeParse({
            studentIds: [
                '22222222-2222-4222-8222-222222222222',
                '44444444-4444-4444-8444-444444444444',
            ],
            status: 'APPROVED',
        });

        expect(result.success).toBe(true);
    });

    it('rejects a bulk-admit update body that passes an invalid status value', () => {
        const result = updateAdmissionsSchema.body.safeParse({
            studentIds: ['22222222-2222-4222-8222-222222222222'],
            status: 'WAITING', // WAITING is not an allowed decision status
        });

        expect(result.success).toBe(false);
    });

    it('validates a successful bulk-admit response with updatedCount', () => {
        const result = updateAdmissionsSchema.response.safeParse({
            message: 'Admission status updated successfully.',
            data: {
                updatedCount: 3,
            },
        });

        expect(result.success).toBe(true);
    });
});
