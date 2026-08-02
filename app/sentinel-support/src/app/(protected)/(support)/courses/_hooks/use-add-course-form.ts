'use client';

import { useCreateCourseMutation } from '@sentinel/hooks';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { courseSchema, type CourseFormValues } from '@sentinel/shared/schema';

export function useAddCourseForm(institutionId: string, onSuccess: () => void) {
    const createCourse = useCreateCourseMutation({
        onSuccess: () => {
            form.reset();
            onSuccess();
        },
    });

    const form = useForm<CourseFormValues>({
        resolver: zodResolver(courseSchema) as Resolver<CourseFormValues>,
        defaultValues: {
            code: '',
            title: '',
            department_id: null,
            description: '',
        },
    });

    function onSubmit(values: CourseFormValues) {
        if (!institutionId) {
            return;
        }

        createCourse.mutate({
            code: values.code || null,
            title: values.title,
            departmentId: values.department_id ?? null,
            description: values.description ?? null,
            institution_id: institutionId,
        });
    }

    return {
        form,
        onSubmit,
        isPending: createCourse.isPending,
    };
}
