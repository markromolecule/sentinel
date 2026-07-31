import { describe, expect, it, vi } from 'vitest';
import {
    getEffectiveEssayRubric,
    updateExamEssayRubric,
    resetExamEssayRubric,
} from './essay-rubric';
import { getBaselineEssayRubric, updateBaselineEssayRubric } from '../access-control';

describe('essay-rubric service APIs', () => {
    describe('getEffectiveEssayRubric', () => {
        it('fetches effective essay rubric with correct examId path', async () => {
            const apiClient = vi.fn().mockResolvedValue({ data: { source: 'BASELINE' } });
            const result = await getEffectiveEssayRubric(apiClient as any, 'exam-uuid-1');

            expect(apiClient).toHaveBeenCalledWith('/rubrics/exams/exam-uuid-1');
            expect(result.source).toBe('BASELINE');
        });
    });

    describe('updateExamEssayRubric', () => {
        it('calls post endpoint with payload to update rubric override', async () => {
            const apiClient = vi.fn().mockResolvedValue({ data: { rubricVersionId: 'version-1' } });
            const payload = { criteria: [] };
            const result = await updateExamEssayRubric(apiClient as any, {
                examId: 'exam-uuid-2',
                payload,
            });

            expect(apiClient).toHaveBeenCalledWith('/rubrics/exams/exam-uuid-2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            expect(result.rubricVersionId).toBe('version-1');
        });
    });

    describe('resetExamEssayRubric', () => {
        it('calls delete endpoint to deactivate exam override', async () => {
            const apiClient = vi.fn().mockResolvedValue({ data: { source: 'BASELINE' } });
            const result = await resetExamEssayRubric(apiClient as any, 'exam-uuid-3');

            expect(apiClient).toHaveBeenCalledWith('/rubrics/exams/exam-uuid-3', {
                method: 'DELETE',
            });
            expect(result.source).toBe('BASELINE');
        });
    });

    describe('baseline essay rubric endpoints', () => {
        it('fetches baseline rubric', async () => {
            const apiClient = vi.fn().mockResolvedValue({ data: { source: 'BASELINE' } });
            const result = await getBaselineEssayRubric(apiClient as any);

            expect(apiClient).toHaveBeenCalledWith('/access-control/essay-rubric');
            expect(result.source).toBe('BASELINE');
        });

        it('updates baseline rubric with payload', async () => {
            const apiClient = vi.fn().mockResolvedValue({ data: { rubricVersionId: 'version-2' } });
            const payload = { criteria: [] };
            const result = await updateBaselineEssayRubric(apiClient as any, payload);

            expect(apiClient).toHaveBeenCalledWith('/access-control/essay-rubric', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            expect(result.rubricVersionId).toBe('version-2');
        });
    });
});
