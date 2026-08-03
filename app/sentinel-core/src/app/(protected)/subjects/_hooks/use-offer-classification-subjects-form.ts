'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateSubjectOfferingsFromClassificationMutation } from '@sentinel/hooks';
import {
    classificationSubjectOfferingFormSchema,
    type ClassificationSubjectOfferingFormValues,
} from '@sentinel/shared/schema';
import {
    type ClassificationSubjectOfferingResult,
    type SubjectClassification,
} from '@sentinel/shared/types';
import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { useAcademicScope } from '@/hooks/use-academic-scope';

function toClassificationOfferingFormValues(
    classification: SubjectClassification | null,
): ClassificationSubjectOfferingFormValues {
    return {
        subject_classification_id: classification?.id ?? '',
        term_id: '',
        department_ids: [],
        course_ids: [],
        section_ids: [],
        year_levels: [],
        duplicate_strategy: 'skip_existing',
    };
}

export function useOfferClassificationSubjectsForm(
    classification: SubjectClassification | null,
    onSuccess: (result: ClassificationSubjectOfferingResult) => void,
) {
    const { assignedDepartmentId, assignedCourseId, shouldLockDepartment, shouldLockCourse } =
        useAcademicScope();

    const form = useForm<ClassificationSubjectOfferingFormValues>({
        resolver: zodResolver(
            classificationSubjectOfferingFormSchema,
        ) as Resolver<ClassificationSubjectOfferingFormValues>,
        defaultValues: toClassificationOfferingFormValues(classification),
    });

    const createOfferings = useCreateSubjectOfferingsFromClassificationMutation({
        onSuccess: (nextResult) => {
            toast.success(`Successfully processed offerings for ${classification?.name}`);
            reset();
            onSuccess(nextResult);
        },
    });

    useEffect(() => {
        form.reset(toClassificationOfferingFormValues(classification));
    }, [classification, form]);

    function reset() {
        form.reset(toClassificationOfferingFormValues(classification));
    }

    function onSubmit(values: ClassificationSubjectOfferingFormValues) {
        const departmentIds =
            shouldLockDepartment && assignedDepartmentId
                ? [assignedDepartmentId]
                : values.department_ids;
        const courseIds =
            shouldLockCourse && assignedCourseId ? [assignedCourseId] : values.course_ids;

        createOfferings.mutate({
            ...values,
            subject_classification_id: classification?.id ?? values.subject_classification_id,
            department_ids: Array.from(new Set(departmentIds)),
            course_ids: Array.from(new Set(courseIds)),
            section_ids: Array.from(new Set(values.section_ids)),
            year_levels: Array.from(new Set(values.year_levels)).sort(
                (left, right) => left - right,
            ),
            duplicate_strategy: values.duplicate_strategy ?? 'skip_existing',
        });
    }

    return {
        form,
        onSubmit,
        reset,
        isPending: createOfferings.isPending,
    };
}
