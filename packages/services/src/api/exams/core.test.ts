import { describe, expect, it, vi } from 'vitest';
import { getExams } from './core';

describe('getExams', () => {
    it('includes exam list filters in the query string when an explicit page is provided', async () => {
        const apiClient = vi.fn().mockResolvedValue({ data: [] });

        await getExams(apiClient as any, {
            search: 'physics',
            institutionId: 'institution-1',
            page: 1,
            limit: 100,
        });

        expect(apiClient).toHaveBeenCalledWith(
            '/exams?search=physics&institutionId=institution-1&page=1&limit=100',
        );
    });

    it('fetches every backend page when no explicit page is requested', async () => {
        const firstPage = Array.from({ length: 100 }, (_, index) => ({
            id: `exam-${index + 1}`,
            title: `Exam ${index + 1}`,
            description: null,
            durationMinutes: 60,
            passingScore: 75,
            status: 'draft',
            classroomId: null,
            classroomName: null,
            subjectId: null,
            subjectTitle: null,
            sectionId: null,
            sectionName: null,
            roomId: null,
            roomName: null,
            scheduledDate: null,
            endDateTime: null,
            publishedAt: null,
            questionCount: 0,
            createdAt: null,
            updatedAt: null,
        }));
        const secondPage = firstPage.slice(0, 12).map((exam, index) => ({
            ...exam,
            id: `exam-${index + 101}`,
            title: `Exam ${index + 101}`,
        }));
        const apiClient = vi
            .fn()
            .mockResolvedValueOnce({ data: firstPage })
            .mockResolvedValueOnce({ data: secondPage });

        const exams = await getExams(apiClient as any, {
            institutionId: 'institution-1',
        });

        expect(exams).toHaveLength(112);
        expect(apiClient).toHaveBeenNthCalledWith(
            1,
            '/exams?institutionId=institution-1&page=1&limit=100',
        );
        expect(apiClient).toHaveBeenNthCalledWith(
            2,
            '/exams?institutionId=institution-1&page=2&limit=100',
        );
    });
});
