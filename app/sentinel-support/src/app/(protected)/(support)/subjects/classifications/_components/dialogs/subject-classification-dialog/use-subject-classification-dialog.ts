import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    useCoursesQuery,
    useCreateSubjectClassificationMutation,
    useDepartmentsQuery,
    useInstitutionsQuery,
    useSubjectsQuery,
    useUpdateSubjectClassificationMutation,
} from '@sentinel/hooks';
import {
    subjectClassificationFormSchema,
    type SubjectClassificationFormValues,
} from '@sentinel/shared/schema';
import { SubjectClassificationDialogProps } from './_types';
import { toDefaultValues } from './_utils';

export function useSubjectClassificationDialog({
    open,
    onOpenChange,
    classification,
}: SubjectClassificationDialogProps) {
    const [subjectSearch, setSubjectSearch] = useState('');
    const form = useForm<SubjectClassificationFormValues>({
        resolver: zodResolver(
            subjectClassificationFormSchema,
        ) as Resolver<SubjectClassificationFormValues>,
        defaultValues: toDefaultValues(classification),
    });

    const selectedInstitutionId =
        useWatch({
            control: form.control,
            name: 'institution_id',
        }) ?? null;

    const classificationType = useWatch({
        control: form.control,
        name: 'type',
    });
    const isCoreClassification = classificationType === 'CORE';

    const { data: institutions = [] } = useInstitutionsQuery({ search: '' });
    const { data: departments = [] } = useDepartmentsQuery({
        search: '',
        institutionId: selectedInstitutionId ?? undefined,
        enabled: Boolean(selectedInstitutionId),
    });
    const { data: courses = [] } = useCoursesQuery({
        search: '',
        institutionId: selectedInstitutionId ?? undefined,
        enabled: Boolean(selectedInstitutionId),
    });
    const { data: subjects = [] } = useSubjectsQuery({
        search: subjectSearch || undefined,
        institutionId: selectedInstitutionId || undefined,
        enabled: Boolean(selectedInstitutionId),
    });

    const createClassification = useCreateSubjectClassificationMutation({
        onSuccess: () => {
            form.reset(toDefaultValues(null));
            onOpenChange(false);
        },
    });
    const updateClassification = useUpdateSubjectClassificationMutation({
        onSuccess: () => {
            onOpenChange(false);
        },
    });

    useEffect(() => {
        form.reset(toDefaultValues(classification));
    }, [classification, form, open]);

    const isPending = createClassification.isPending || updateClassification.isPending;
    const selectedDepartmentId = useWatch({
        control: form.control,
        name: 'department_id',
    });

    const filteredCourses = useMemo(() => {
        if (!selectedDepartmentId) {
            return courses;
        }

        return courses.filter((course) => course.departmentId === selectedDepartmentId);
    }, [courses, selectedDepartmentId]);

    const visibleSubjects = useMemo(() => {
        const normalizedSearch = subjectSearch.trim().toLowerCase();

        if (!normalizedSearch) {
            return subjects;
        }

        return subjects.filter((subject) => {
            const haystack = `${subject.code} ${subject.title}`.toLowerCase();
            return haystack.includes(normalizedSearch);
        });
    }, [subjectSearch, subjects]);

    const toggleSelected = (
        fieldValue: string[],
        nextValue: string,
        onChange: (value: string[]) => void,
    ) => {
        if (fieldValue.includes(nextValue)) {
            onChange(fieldValue.filter((value) => value !== nextValue));
            return;
        }

        onChange([...fieldValue, nextValue]);
    };

    const handleSubmit = (values: SubjectClassificationFormValues) => {
        if (!values.institution_id) {
            form.setError('institution_id', {
                type: 'manual',
                message: 'Institution is required',
            });
            return;
        }

        const payload: SubjectClassificationFormValues = {
            ...values,
            description: '',
            department_id: values.type === 'CORE' ? values.department_id : null,
            course_ids: values.type === 'CORE' ? values.course_ids : [],
            year_levels: Array.from(new Set(values.year_levels)).sort(
                (left, right) => left - right,
            ),
        };

        if (classification) {
            updateClassification.mutate({
                id: classification.id,
                payload,
            });
            return;
        }

        createClassification.mutate(payload);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setSubjectSearch('');
        }
        onOpenChange(nextOpen);
    };

    return {
        form,
        subjectSearch,
        setSubjectSearch,
        institutions,
        departments,
        courses,
        filteredCourses,
        visibleSubjects,
        isPending,
        isCoreClassification,
        selectedInstitutionId,
        toggleSelected,
        handleSubmit,
        handleOpenChange,
    };
}
