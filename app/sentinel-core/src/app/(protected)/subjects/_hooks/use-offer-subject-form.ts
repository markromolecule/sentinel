'use client';

import { useCreateSubjectOfferingMutation, useSubjectOfferingsQuery } from '@sentinel/hooks';
import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subjectOfferingFormSchema, type SubjectOfferingFormValues } from '@sentinel/shared/schema';
import { type MasterSubject } from '@sentinel/shared/types';
import { toast } from 'sonner';
import {
    EMPTY_SUBJECT_OFFERING_FORM_VALUES,
    toSubjectOfferingFormValues,
} from '@/app/(protected)/subjects/_hooks/subject-offering-form-values';
import { useAcademicScope } from '@/hooks/use-academic-scope';

export function useOfferSubjectForm(subject: MasterSubject | null, onSuccess: () => void) {
    const { data: existingOfferings = [] } = useSubjectOfferingsQuery();
    const { assignedDepartmentId, assignedCourseId, shouldLockDepartment, shouldLockCourse } =
        useAcademicScope();

    const form = useForm<SubjectOfferingFormValues>({
        resolver: zodResolver(subjectOfferingFormSchema) as Resolver<SubjectOfferingFormValues>,
        defaultValues: toSubjectOfferingFormValues(subject),
    });

    const createSubjectOffering = useCreateSubjectOfferingMutation({
        onSuccess: () => {
            toast.success(`Successfully created offering for ${subject?.code} - ${subject?.title}`);
            form.reset(toSubjectOfferingFormValues(subject));
            onSuccess();
        },
    });

    useEffect(() => {
        form.reset(toSubjectOfferingFormValues(subject));
    }, [form, subject]);

    function onSubmit(values: SubjectOfferingFormValues) {
        const departmentIds =
            shouldLockDepartment && assignedDepartmentId
                ? [assignedDepartmentId]
                : values.department_ids;
        const courseIds =
            shouldLockCourse && assignedCourseId ? [assignedCourseId] : values.course_ids;

        const normalizedValues: SubjectOfferingFormValues = {
            subject_id: values.subject_id,
            term_id: values.term_id,
            department_ids: Array.from(new Set(departmentIds)),
            course_ids: Array.from(new Set(courseIds)),
            section_ids: Array.from(new Set(values.section_ids)),
            year_levels: Array.from(new Set(values.year_levels)).sort(
                (left, right) => left - right,
            ),
        };

        const hasDuplicateOffering = existingOfferings.some(
            (offering) =>
                offering.subjectId === normalizedValues.subject_id &&
                offering.termId === normalizedValues.term_id,
        );

        if (hasDuplicateOffering) {
            form.setError('term_id', {
                type: 'manual',
                message: 'This subject is already offered for the selected term',
            });
            toast.error('This subject is already offered for the selected term');
            return;
        }

        createSubjectOffering.mutate(normalizedValues);
    }

    function reset() {
        form.reset({
            ...EMPTY_SUBJECT_OFFERING_FORM_VALUES,
            subject_id: subject?.id ?? '',
        });
    }

    return {
        form,
        onSubmit,
        isPending: createSubjectOffering.isPending,
        reset,
    };
}
