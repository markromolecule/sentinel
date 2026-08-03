import { useEffect } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { type SubjectOfferingFormValues } from '@sentinel/shared/schema';

type UseAcademicScopeSyncArgs = {
    form: UseFormReturn<SubjectOfferingFormValues>;
    assignedDepartmentId: string | undefined;
    assignedCourseId: string | undefined;
    shouldLockDepartment: boolean;
    shouldLockCourse: boolean;
};

export function useAcademicScopeSync({
    form,
    assignedDepartmentId,
    assignedCourseId,
    shouldLockDepartment,
    shouldLockCourse,
}: UseAcademicScopeSyncArgs) {
    useEffect(() => {
        if (shouldLockDepartment && assignedDepartmentId) {
            const nextDepartmentIds = [assignedDepartmentId];
            const currentDepartmentIds = form.getValues('department_ids') ?? [];

            if (
                currentDepartmentIds.length !== nextDepartmentIds.length ||
                currentDepartmentIds[0] !== assignedDepartmentId
            ) {
                form.setValue('department_ids', nextDepartmentIds, {
                    shouldDirty: false,
                    shouldValidate: true,
                });
            }
        }
    }, [assignedDepartmentId, form, shouldLockDepartment]);

    useEffect(() => {
        if (shouldLockCourse && assignedCourseId) {
            const nextCourseIds = [assignedCourseId];
            const currentCourseIds = form.getValues('course_ids') ?? [];

            if (
                currentCourseIds.length !== nextCourseIds.length ||
                currentCourseIds[0] !== assignedCourseId
            ) {
                form.setValue('course_ids', nextCourseIds, {
                    shouldDirty: false,
                    shouldValidate: true,
                });
            }
        }
    }, [assignedCourseId, form, shouldLockCourse]);
}
