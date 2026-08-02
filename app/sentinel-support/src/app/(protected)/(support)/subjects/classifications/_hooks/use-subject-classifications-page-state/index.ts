'use client';

import { useEffect, useMemo, useState } from 'react';
import { type PaginationState } from '@tanstack/react-table';
import {
    isPermissionDeniedError,
    useActivePermissions,
    useDebounce,
    useInstitutionsQuery,
    useSubjectClassificationsQuery,
    useDeleteSubjectClassificationMutation,
} from '@sentinel/hooks';
import { SubjectClassification } from '@sentinel/shared/types';
import { useAcademicScope, useInstitutionFacet } from '@/hooks';

function getClassificationResolutionKey(classification: SubjectClassification) {
    return classification.sourceRecordId ?? classification.id;
}

function getClassificationPriority(classification: SubjectClassification) {
    if (classification.isLocal || (classification.inheritanceStatus ?? 'LOCAL') === 'LOCAL') {
        return 0;
    }

    if (classification.isOverridden || classification.inheritanceStatus === 'OVERRIDDEN') {
        return 1;
    }

    if (classification.isInherited || classification.inheritanceStatus === 'INHERITED') {
        return 2;
    }

    return 3;
}

function collapseInheritedClassificationProjections(classifications: SubjectClassification[]) {
    const byResolutionKey = new Map<string, SubjectClassification>();

    for (const classification of classifications) {
        const resolutionKey = getClassificationResolutionKey(classification);
        const existing = byResolutionKey.get(resolutionKey);

        if (
            !existing ||
            getClassificationPriority(classification) < getClassificationPriority(existing)
        ) {
            byResolutionKey.set(resolutionKey, classification);
        }
    }

    return Array.from(byResolutionKey.values());
}

/**
 * Custom hook to manage all page-level state, data fetching, filtering,
 * and mutations for the Subject Classifications view.
 */
export function useSubjectClassificationsPageState() {
    const { hasPermission } = useActivePermissions();
    const { institutionId, isLoading: isScopeLoading } = useAcademicScope();
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedClassification, setSelectedClassification] =
        useState<SubjectClassification | null>(null);
    const [selectedOfferingClassification, setSelectedOfferingClassification] =
        useState<SubjectClassification | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const debouncedSearch = useDebounce(searchTerm, 400);

    // Facet States
    const [selectedInstitutions, setSelectedInstitutions] = useState<Set<string>>(new Set());
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [selectedOrigins, setSelectedOrigins] = useState<Set<string>>(new Set());

    const [hasInitializedScope, setHasInitializedScope] = useState(false);

    useEffect(() => {
        if (!isScopeLoading && !hasInitializedScope) {
            if (institutionId) {
                setSelectedInstitutions(new Set([institutionId]));
            }
            setHasInitializedScope(true);
        }
    }, [institutionId, isScopeLoading, hasInitializedScope]);

    const activeInstitutionId =
        selectedInstitutions.size > 0 ? Array.from(selectedInstitutions)[0] : undefined;

    useEffect(() => {
        setPagination((current) =>
            current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
        );
    }, [debouncedSearch, activeInstitutionId]);

    // Data Fetching
    const { data: institutions = [] } = useInstitutionsQuery();
    const {
        data: classificationsResponse,
        isLoading: isClassificationsLoading,
        isError,
        error,
    } = useSubjectClassificationsQuery(
        debouncedSearch || undefined,
        activeInstitutionId,
        pagination.pageIndex + 1,
        pagination.pageSize,
    );

    const rawClassifications = classificationsResponse?.items ?? [];
    const collapsedClassifications = useMemo(
        () => collapseInheritedClassificationProjections(rawClassifications),
        [rawClassifications],
    );
    const classifications =
        selectedOrigins.size > 0 ? rawClassifications : collapsedClassifications;
    const totalCount = classifications.length;
    const pageCount = classificationsResponse?.pagination
        ? Math.max(1, Math.ceil(totalCount / pagination.pageSize))
        : 1;

    const isLoading = isClassificationsLoading || !hasInitializedScope;

    // Mutations
    const deleteClassification = useDeleteSubjectClassificationMutation();

    // Permissions & Error Handling
    const isViewDenied = isPermissionDeniedError(error, 'subjects:view');
    const canCreate = hasPermission('subjects:create');
    const canOffer = hasPermission('subject_offerings:offer');
    const canUpdate = hasPermission('subjects:update');
    const canDelete = hasPermission('subjects:delete');

    // Mappings & Memoized Computations
    const institutionNameById = useMemo(
        () => new Map(institutions.map((institution) => [institution.id, institution.name])),
        [institutions],
    );

    // Client-side filtering for Type and Origin Status
    const filteredClassifications = useMemo(() => {
        return classifications.filter((classification) => {
            if (selectedTypes.size > 0 && !selectedTypes.has(classification.type)) {
                return false;
            }
            if (
                selectedOrigins.size > 0 &&
                !selectedOrigins.has(classification.inheritanceStatus ?? 'LOCAL')
            ) {
                return false;
            }
            return true;
        });
    }, [classifications, selectedTypes, selectedOrigins]);

    // Facet Options
    const institutionFacetOptions = useInstitutionFacet({ institutions });

    const typeOptions = useMemo(
        () => [
            { label: 'General', value: 'GENERAL' },
            { label: 'Core', value: 'CORE' },
        ],
        [],
    );

    const originOptions = useMemo(
        () => [
            { label: 'Local', value: 'LOCAL' },
            { label: 'Inherited', value: 'INHERITED' },
        ],
        [],
    );

    // Dynamic Counts for Facets
    const typeCounts = useMemo(() => {
        const counts = new Map<string, number>();
        counts.set('GENERAL', classifications.filter((c) => c.type === 'GENERAL').length);
        counts.set('CORE', classifications.filter((c) => c.type === 'CORE').length);
        return counts;
    }, [classifications]);

    const originCounts = useMemo(() => {
        const counts = new Map<string, number>();
        counts.set(
            'LOCAL',
            rawClassifications.filter((c) => (c.inheritanceStatus ?? 'LOCAL') === 'LOCAL').length,
        );
        counts.set(
            'INHERITED',
            rawClassifications.filter((c) => c.inheritanceStatus === 'INHERITED').length,
        );
        return counts;
    }, [rawClassifications]);

    const isFiltered = Boolean(
        searchTerm ||
        selectedInstitutions.size > 0 ||
        selectedTypes.size > 0 ||
        selectedOrigins.size > 0,
    );

    // Action Handlers
    const handleSelectInstitution = (value: string) => {
        const next = new Set<string>();
        if (!selectedInstitutions.has(value)) {
            next.add(value);
        }
        setSelectedInstitutions(next);
    };

    const handleClearInstitutions = () => setSelectedInstitutions(new Set());

    const handleSelectType = (value: string) => {
        const next = new Set(selectedTypes);
        if (next.has(value)) {
            next.delete(value);
        } else {
            next.add(value);
        }
        setSelectedTypes(next);
    };

    const handleClearTypes = () => setSelectedTypes(new Set());

    const handleSelectOrigin = (value: string) => {
        const next = new Set(selectedOrigins);
        if (next.has(value)) {
            next.delete(value);
        } else {
            next.add(value);
        }
        setSelectedOrigins(next);
    };

    const handleClearOrigins = () => setSelectedOrigins(new Set());

    const handleCreate = () => {
        setSelectedClassification(null);
        setDialogOpen(true);
    };

    const handleOffer = (classification: SubjectClassification) => {
        setSelectedOfferingClassification(classification);
    };

    const handleEdit = (classification: SubjectClassification) => {
        setSelectedClassification(classification);
        setDialogOpen(true);
    };

    const handleDelete = (classification: SubjectClassification) => {
        if (window.confirm(`Delete classification "${classification.name}"?`)) {
            deleteClassification.mutate({
                id: classification.id,
                institutionId: classification.institution_id ?? undefined,
            });
        }
    };

    return {
        // States & Setters
        searchTerm,
        setSearchTerm,
        dialogOpen,
        setDialogOpen,
        selectedClassification,
        setSelectedClassification,
        selectedOfferingClassification,
        setSelectedOfferingClassification,
        selectedInstitutions,
        selectedTypes,
        selectedOrigins,

        // Data Query
        institutions,
        classifications,
        totalCount,
        pageCount,
        pagination,
        setPagination,
        filteredClassifications,
        isLoading,
        isError,
        error,
        deleteClassification,

        // Permissions
        isViewDenied,
        canCreate,
        canOffer,
        canUpdate,
        canDelete,

        // Memos/Facets
        institutionNameById,
        institutionFacetOptions,
        typeOptions,
        originOptions,
        typeCounts,
        originCounts,
        isFiltered,

        // Handlers
        handleSelectInstitution,
        handleClearInstitutions,
        handleSelectType,
        handleClearTypes,
        handleSelectOrigin,
        handleClearOrigins,
        handleCreate,
        handleOffer,
        handleEdit,
        handleDelete,
    };
}
