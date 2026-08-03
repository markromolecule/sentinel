import { useEffect } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    useCreateSubjectClassificationMutation,
    useUpdateSubjectClassificationMutation,
    useProfileQuery,
} from '@sentinel/hooks';
import {
    subjectClassificationFormSchema,
    type SubjectClassificationFormValues,
} from '@sentinel/shared/schema';
import { type SubjectClassification } from '@sentinel/shared/types';

export const EMPTY_SUBJECT_CLASSIFICATION_FORM_VALUES: SubjectClassificationFormValues = {
    name: '',
    type: 'GENERAL',
    description: '',
    subject_ids: [],
    department_id: null,
    course_ids: [],
    year_levels: [],
};

function toFormValues(
    classification: SubjectClassification | null,
): SubjectClassificationFormValues {
    if (!classification) {
        return EMPTY_SUBJECT_CLASSIFICATION_FORM_VALUES;
    }

    return {
        name: classification.name,
        type: classification.type,
        description: classification.description ?? '',
        subject_ids: classification.subjects.map((subject) => subject.id),
        department_id: classification.department_id ?? null,
        course_ids: classification.course_ids ?? [],
        year_levels: classification.year_levels ?? [],
    };
}

interface UseSubjectClassificationFormProps {
    classification: SubjectClassification | null;
    onOpenChange: (open: boolean) => void;
    open: boolean;
}

export function useSubjectClassificationForm({
    classification,
    onOpenChange,
    open,
}: UseSubjectClassificationFormProps) {
    const form = useForm<SubjectClassificationFormValues>({
        resolver: zodResolver(
            subjectClassificationFormSchema,
        ) as Resolver<SubjectClassificationFormValues>,
        defaultValues: toFormValues(classification),
    });

    const { profile } = useProfileQuery();
    const isAdmin = profile?.role === 'admin';

    const createSubjectClassification = useCreateSubjectClassificationMutation({
        onSuccess: () => {
            form.reset(EMPTY_SUBJECT_CLASSIFICATION_FORM_VALUES);
            onOpenChange(false);
        },
    });

    const updateSubjectClassification = useUpdateSubjectClassificationMutation({
        onSuccess: () => {
            form.reset(toFormValues(classification));
            onOpenChange(false);
        },
    });

    useEffect(() => {
        if (open) {
            form.reset(toFormValues(classification));
        }
    }, [classification, form, open]);

    const classificationType = useWatch({
        control: form.control,
        name: 'type',
    });

    // Auto-fill logic based on role
    useEffect(() => {
        if (!open || classification) return;

        if (classificationType === 'CORE') {
            if (profile?.department_id) {
                form.setValue('department_id', profile.department_id);
            }
            if (isAdmin && profile?.course_id) {
                form.setValue('course_ids', [profile.course_id]);
            }
        } else {
            form.setValue('department_id', null);
            form.setValue('course_ids', []);
        }
    }, [classificationType, profile, form, open, classification, isAdmin]);

    function onSubmit(values: SubjectClassificationFormValues) {
        const payload: SubjectClassificationFormValues = {
            name: values.name.trim(),
            type: values.type,
            description: values.description?.trim() ?? '',
            subject_ids: values.subject_ids,
            department_id: values.type === 'CORE' ? values.department_id : null,
            course_ids: values.type === 'CORE' ? values.course_ids : [],
            year_levels: Array.from(new Set(values.year_levels)).sort(
                (left, right) => left - right,
            ),
        };

        if (classification) {
            updateSubjectClassification.mutate({
                id: classification.id,
                payload,
            });
            return;
        }

        createSubjectClassification.mutate(payload);
    }

    const isPending =
        createSubjectClassification.isPending || updateSubjectClassification.isPending;

    return {
        form,
        onSubmit,
        isPending,
        isAdmin,
    };
}
