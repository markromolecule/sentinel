'use client';

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStudentExamData } from './use-student-exam-data';

const { mockUseExamQuery, mockUseExamConfigurationQuery } = vi.hoisted(() => ({
    mockUseExamQuery: vi.fn(),
    mockUseExamConfigurationQuery: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({
        id: 'exam-1',
    }),
}));

vi.mock('@sentinel/hooks', () => ({
    useExamQuery: (examId: string) => mockUseExamQuery(examId),
    useExamConfigurationQuery: (examId: string) => mockUseExamConfigurationQuery(examId),
}));

describe('useStudentExamData', () => {
    it('exposes a locked blocked state from runtime access', () => {
        mockUseExamQuery.mockReturnValue({
            data: {
                runtimeAccess: {
                    state: 'locked',
                    reasonCode: 'LOCKED',
                    message: 'This exam attempt is locked right now.',
                    canStart: false,
                    canResume: false,
                    hasActiveAttempt: true,
                    startsAt: null,
                    endsAt: null,
                    reopenedUntil: null,
                },
            },
            isLoading: false,
            refetch: vi.fn(),
        });
        mockUseExamConfigurationQuery.mockReturnValue({
            data: null,
            isLoading: false,
        });

        const { result } = renderHook(() => useStudentExamData());

        expect(result.current.blockedState).toEqual({
            isBlocked: true,
            code: 'LOCKED',
            title: 'Exam Locked',
            message: 'This exam attempt is locked right now.',
        });
    });

    it('exposes a closed blocked state from runtime access', () => {
        mockUseExamQuery.mockReturnValue({
            data: {
                runtimeAccess: {
                    state: 'closed',
                    reasonCode: 'CLOSED',
                    message: 'This exam has been closed.',
                    canStart: false,
                    canResume: false,
                    hasActiveAttempt: false,
                    startsAt: null,
                    endsAt: null,
                    reopenedUntil: null,
                },
            },
            isLoading: false,
            refetch: vi.fn(),
        });
        mockUseExamConfigurationQuery.mockReturnValue({
            data: null,
            isLoading: false,
        });

        const { result } = renderHook(() => useStudentExamData());

        expect(result.current.blockedState).toEqual({
            isBlocked: true,
            code: 'CLOSED',
            title: 'Exam Closed',
            message: 'This exam has been closed.',
        });
    });

    it('exposes configQueryError when configuration query fails and no embedded config exists', () => {
        mockUseExamQuery.mockReturnValue({
            data: {
                configuration: null,
            },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        });
        mockUseExamConfigurationQuery.mockReturnValue({
            data: null,
            isLoading: false,
            isError: true,
        });

        const { result } = renderHook(() => useStudentExamData());

        expect(result.current.configQueryError).toBe(true);
    });

    it('does not block the flow on the configuration request when exam data includes configuration', () => {
        mockUseExamQuery.mockReturnValue({
            data: {
                configuration: {
                    lobbyAdmissionMode: 'AUTOMATIC',
                    maxReconnectAttempts: 3,
                },
            },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        });
        mockUseExamConfigurationQuery.mockReturnValue({
            data: null,
            isLoading: true,
            isError: false,
        });

        const { result } = renderHook(() => useStudentExamData());

        expect(result.current.isLoading).toBe(false);
    });

    it('preserves server question order when configuration is still loading to avoid sorting flash', () => {
        const serverOrderedQuestions = [
            { id: 'q-2', orderIndex: 2, points: 1 },
            { id: 'q-1', orderIndex: 1, points: 1 },
            { id: 'q-3', orderIndex: 3, points: 1 },
        ];

        mockUseExamQuery.mockReturnValue({
            data: {
                questions: serverOrderedQuestions,
                settings: null,
            },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        });
        mockUseExamConfigurationQuery.mockReturnValue({
            data: null,
            isLoading: true,
            isError: false,
        });

        const { result } = renderHook(() => useStudentExamData());

        expect(result.current.questions.map((q) => q.id)).toEqual(['q-2', 'q-1', 'q-3']);
    });

    it('preserves server question order when shuffleQuestions is true', () => {
        const shuffledQuestions = [
            { id: 'q-3', orderIndex: 3, points: 1 },
            { id: 'q-1', orderIndex: 1, points: 1 },
            { id: 'q-2', orderIndex: 2, points: 1 },
        ];

        mockUseExamQuery.mockReturnValue({
            data: {
                questions: shuffledQuestions,
                settings: { shuffleQuestions: true },
            },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        });
        mockUseExamConfigurationQuery.mockReturnValue({
            data: {
                settings: { shuffleQuestions: true },
            },
            isLoading: false,
            isError: false,
        });

        const { result } = renderHook(() => useStudentExamData());

        expect(result.current.questions.map((q) => q.id)).toEqual(['q-3', 'q-1', 'q-2']);
    });

    it('sorts questions by orderIndex when shuffleQuestions is false and configuration is loaded', () => {
        const unorderedQuestions = [
            { id: 'q-3', orderIndex: 3, points: 1 },
            { id: 'q-1', orderIndex: 1, points: 1 },
            { id: 'q-2', orderIndex: 2, points: 1 },
        ];

        mockUseExamQuery.mockReturnValue({
            data: {
                questions: unorderedQuestions,
                settings: { shuffleQuestions: false },
            },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        });
        mockUseExamConfigurationQuery.mockReturnValue({
            data: {
                settings: { shuffleQuestions: false },
            },
            isLoading: false,
            isError: false,
        });

        const { result } = renderHook(() => useStudentExamData());

        expect(result.current.questions.map((q) => q.id)).toEqual(['q-1', 'q-2', 'q-3']);
    });
});

