'use client';

import {
    useCreateSubjectMutation,
    useDebounce,
    useDeleteSubjectMutation,
    useInstitutionsQuery,
    useSubjectsQuery,
    useUpdateSubjectMutation,
} from '@sentinel/hooks';
import { MasterSubject } from '@sentinel/shared/types';
import { useMemo, useState } from 'react';
import { type PaginationState } from '@tanstack/react-table';
import { useAcademicScope } from '@/hooks';
import { EMPTY_SUBJECT_FORM, SubjectFormState, getSubjectId } from './_types';

export function useSubjectsPageState() {
    const { institutionId, isLoading: isScopeLoading } = useAcademicScope();
    const [searchTerm, setSearchTermState] = useState('');
    const [manualInstitutionId, setManualInstitutionId] = useState<string | undefined>(undefined);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<SubjectFormState>(EMPTY_SUBJECT_FORM);
    const [subjectToRevert, setSubjectToRevert] = useState<MasterSubject | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const selectedInstitutionId = manualInstitutionId ?? (institutionId || undefined);

    const debouncedSearch = useDebounce(searchTerm, 500);

    const setSearchTerm = (value: string) => {
        setSearchTermState(value);
        setPagination((current) =>
            current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
        );
    };

    const setSelectedInstitutionId = (value: string | undefined) => {
        setManualInstitutionId(value);
        setPagination((current) =>
            current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
        );
    };

    const { data: institutions = [] } = useInstitutionsQuery();
    const selectedInstitution = institutions.find(
        (institution) => institution.id === selectedInstitutionId,
    );
    const parentInstitutionId = selectedInstitution?.parentInstitutionId ?? '';

    const {
        data: subjectsResponse,
        isLoading: isSubjectsLoading,
        isError,
        error,
    } = useSubjectsQuery({
        search: debouncedSearch,
        institutionId: selectedInstitutionId || undefined,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
    });

    const subjects = subjectsResponse?.items ?? [];
    const totalCount = subjectsResponse?.pagination?.total ?? 0;
    const pageCount = subjectsResponse?.pagination
        ? Math.max(1, Math.ceil(totalCount / pagination.pageSize))
        : 1;

    const isLoading = isSubjectsLoading || isScopeLoading;

    const { data: parentSubjects = [] } = useSubjectsQuery({
        search: undefined,
        institutionId: parentInstitutionId || undefined,
        enabled: Boolean(parentInstitutionId),
    });

    const createSubjectMutation = useCreateSubjectMutation({
        onSuccess: () => {
            setFormOpen(false);
            setForm(EMPTY_SUBJECT_FORM);
        },
    });

    const updateSubjectMutation = useUpdateSubjectMutation({
        onSuccess: () => {
            setFormOpen(false);
            setForm(EMPTY_SUBJECT_FORM);
        },
    });

    const deleteSubjectMutation = useDeleteSubjectMutation();

    const parentSubject = useMemo(
        () =>
            subjectToRevert?.sourceRecordId
                ? parentSubjects.find(
                      (subject) => getSubjectId(subject) === subjectToRevert.sourceRecordId,
                  )
                : undefined,
        [parentSubjects, subjectToRevert],
    );

    const handleEdit = (subject: MasterSubject) => {
        const subjectId = getSubjectId(subject);
        setForm({
            id: subjectId,
            code: subject.code,
            title: subject.title,
            institutionId: selectedInstitutionId || undefined,
            isInherited: subject.isInherited,
        });
        setFormOpen(true);
    };

    const handleCreate = () => {
        setForm({
            ...EMPTY_SUBJECT_FORM,
            institutionId: selectedInstitutionId || '',
        });
        setFormOpen(true);
    };

    const handleRevert = () => {
        if (!subjectToRevert) return;
        const subjectId = getSubjectId(subjectToRevert);
        if (!subjectId) return;

        deleteSubjectMutation.mutate(
            {
                id: subjectId,
                institutionId: selectedInstitutionId || undefined,
            },
            {
                onSuccess: () => setSubjectToRevert(null),
            },
        );
    };

    const submitForm = () => {
        if (!form.code.trim() || !form.title.trim()) return;

        if (form.id) {
            if (
                form.isInherited &&
                !window.confirm(
                    'This inherited subject will become a local override for the selected branch context.',
                )
            ) {
                return;
            }

            updateSubjectMutation.mutate({
                id: form.id,
                payload: {
                    code: form.code.trim(),
                    title: form.title.trim(),
                    institution_id: selectedInstitutionId || undefined,
                },
            });
            return;
        }

        if (!form.institutionId) return;

        createSubjectMutation.mutate({
            code: form.code.trim(),
            title: form.title.trim(),
            institution_id: form.institutionId,
        });
    };

    return {
        searchTerm,
        setSearchTerm,
        selectedInstitutionId,
        setSelectedInstitutionId,
        formOpen,
        setFormOpen,
        form,
        setForm,
        subjectToRevert,
        setSubjectToRevert,
        institutions,
        subjects,
        totalCount,
        pageCount,
        pagination,
        setPagination,
        isLoading,
        isError,
        error,
        parentSubject,
        handleEdit,
        handleCreate,
        handleRevert,
        submitForm,
        createSubjectMutation,
        updateSubjectMutation,
        deleteSubjectMutation,
    };
}
