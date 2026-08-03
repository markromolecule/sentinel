import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubjectClassificationsPageState } from './index';
import {
    useActivePermissions,
    useInstitutionsQuery,
    useSubjectClassificationsQuery,
} from '@sentinel/hooks';

const mockDeleteMutation = {
    mutate: vi.fn(),
    isPending: false,
};

vi.mock('@sentinel/hooks', () => ({
    useActivePermissions: vi.fn(),
    useDebounce: vi.fn((val) => val),
    useInstitutionsQuery: vi.fn(),
    useSubjectClassificationsQuery: vi.fn(),
    useDeleteSubjectClassificationMutation: vi.fn(() => mockDeleteMutation),
    isPermissionDeniedError: vi.fn(() => false),
}));

const mockUseAcademicScope = vi.fn(() => ({
    institutionId: '',
    isLoading: false,
}));

vi.mock('@/hooks', () => ({
    useInstitutionFacet: vi.fn(() => []),
    useAcademicScope: () => mockUseAcademicScope(),
}));

describe('useSubjectClassificationsPageState', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useActivePermissions as any).mockReturnValue({
            hasPermission: vi.fn(() => true),
        });
        (useInstitutionsQuery as any).mockReturnValue({
            data: [{ id: 'inst-1', name: 'Institution 1' }],
        });
        (useSubjectClassificationsQuery as any).mockReturnValue({
            data: {
                items: [
                    {
                        id: 'class-1',
                        name: 'Math Class',
                        type: 'GENERAL',
                        inheritanceStatus: 'LOCAL',
                        subjectCount: 2,
                        subjects: [],
                    },
                    {
                        id: 'class-2',
                        name: 'Science Class',
                        type: 'CORE',
                        inheritanceStatus: 'INHERITED',
                        subjectCount: 1,
                        subjects: [],
                    },
                ],
                pagination: { page: 1, limit: 10, total: 2, hasMore: false },
            },
            isLoading: false,
            isError: false,
            error: null,
        });
    });

    it('initializes with default states', () => {
        const { result } = renderHook(() => useSubjectClassificationsPageState());
        expect(result.current.searchTerm).toBe('');
        expect(result.current.dialogOpen).toBe(false);
        expect(result.current.selectedClassification).toBeNull();
        expect(result.current.selectedOfferingClassification).toBeNull();
        expect(result.current.isFiltered).toBe(false);
        expect(result.current.filteredClassifications.length).toBe(2);
    });

    it('filters classifications client-side based on type and origin status', () => {
        const { result } = renderHook(() => useSubjectClassificationsPageState());

        // Filter by GENERAL type
        act(() => {
            result.current.handleSelectType('GENERAL');
        });
        expect(result.current.filteredClassifications.length).toBe(1);
        expect(result.current.filteredClassifications[0].id).toBe('class-1');

        // Filter by INHERITED origin status
        act(() => {
            result.current.handleClearTypes();
            result.current.handleSelectOrigin('INHERITED');
        });
        expect(result.current.filteredClassifications.length).toBe(1);
        expect(result.current.filteredClassifications[0].id).toBe('class-2');
    });

    it('collapses inherited projections when the source classification is already visible locally', () => {
        (useSubjectClassificationsQuery as any).mockReturnValue({
            data: {
                items: [
                    {
                        id: 'shared-class',
                        name: 'General Subjects',
                        type: 'GENERAL',
                        inheritanceStatus: 'LOCAL',
                        sourceRecordId: 'shared-class',
                        subjectCount: 18,
                        subjects: [],
                    },
                    {
                        id: 'shared-class',
                        name: 'General Subjects',
                        type: 'GENERAL',
                        inheritanceStatus: 'INHERITED',
                        sourceRecordId: 'shared-class',
                        effectiveInstitutionId: 'branch-1',
                        subjectCount: 18,
                        subjects: [],
                    },
                ],
                pagination: { page: 1, limit: 10, total: 2, hasMore: false },
            },
            isLoading: false,
            isError: false,
            error: null,
        });

        const { result } = renderHook(() => useSubjectClassificationsPageState());

        expect(result.current.classifications).toHaveLength(1);
        expect(result.current.filteredClassifications).toHaveLength(1);
        expect(result.current.filteredClassifications[0]).toMatchObject({
            id: 'shared-class',
            inheritanceStatus: 'LOCAL',
        });
        expect(result.current.totalCount).toBe(1);
    });

    it('shows inherited projections when the inherited origin filter is selected', () => {
        (useSubjectClassificationsQuery as any).mockReturnValue({
            data: {
                items: [
                    {
                        id: 'shared-class',
                        name: 'General Subjects',
                        type: 'GENERAL',
                        inheritanceStatus: 'LOCAL',
                        sourceRecordId: 'shared-class',
                        subjectCount: 18,
                        subjects: [],
                    },
                    {
                        id: 'shared-class',
                        name: 'General Subjects',
                        type: 'GENERAL',
                        inheritanceStatus: 'INHERITED',
                        sourceRecordId: 'shared-class',
                        effectiveInstitutionId: 'branch-1',
                        subjectCount: 18,
                        subjects: [],
                    },
                ],
                pagination: { page: 1, limit: 10, total: 2, hasMore: false },
            },
            isLoading: false,
            isError: false,
            error: null,
        });

        const { result } = renderHook(() => useSubjectClassificationsPageState());

        act(() => {
            result.current.handleSelectOrigin('INHERITED');
        });

        expect(result.current.filteredClassifications).toHaveLength(1);
        expect(result.current.filteredClassifications[0]).toMatchObject({
            id: 'shared-class',
            inheritanceStatus: 'INHERITED',
            effectiveInstitutionId: 'branch-1',
        });
    });

    it('sets proper counts for facets', () => {
        const { result } = renderHook(() => useSubjectClassificationsPageState());
        expect(result.current.typeCounts.get('GENERAL')).toBe(1);
        expect(result.current.typeCounts.get('CORE')).toBe(1);
        expect(result.current.originCounts.get('LOCAL')).toBe(1);
        expect(result.current.originCounts.get('INHERITED')).toBe(1);
    });

    it('sets default institution filter to user institution ID when loaded', () => {
        mockUseAcademicScope.mockReturnValue({
            institutionId: 'inst-123',
            isLoading: false,
        });

        const { result } = renderHook(() => useSubjectClassificationsPageState());
        expect(result.current.selectedInstitutions.has('inst-123')).toBe(true);
        expect(result.current.isFiltered).toBe(true);
    });

    it('resets pagination when the scoped institution filter changes', () => {
        const { result } = renderHook(() => useSubjectClassificationsPageState());

        act(() => {
            result.current.setPagination({
                pageIndex: 2,
                pageSize: 10,
            });
        });

        act(() => {
            result.current.handleSelectInstitution('inst-1');
        });

        expect(result.current.pagination).toEqual({
            pageIndex: 0,
            pageSize: 10,
        });
    });

    it('resets pagination when the debounced search term changes', () => {
        const { result } = renderHook(() => useSubjectClassificationsPageState());

        act(() => {
            result.current.setPagination({
                pageIndex: 1,
                pageSize: 10,
            });
        });

        act(() => {
            result.current.setSearchTerm('science');
        });

        expect(result.current.pagination).toEqual({
            pageIndex: 0,
            pageSize: 10,
        });
    });

    it('opens a delete confirmation before deleting a classification', () => {
        const { result } = renderHook(() => useSubjectClassificationsPageState());
        const classification = result.current.filteredClassifications[0];

        act(() => {
            result.current.handleDelete(classification);
        });

        expect(result.current.classificationToDelete).toEqual(classification);
        expect(mockDeleteMutation.mutate).not.toHaveBeenCalled();

        act(() => {
            result.current.handleConfirmDelete();
        });

        expect(mockDeleteMutation.mutate).toHaveBeenCalledWith(
            {
                id: classification.id,
                institutionId: undefined,
            },
            {
                onSuccess: expect.any(Function),
            },
        );
    });
});
