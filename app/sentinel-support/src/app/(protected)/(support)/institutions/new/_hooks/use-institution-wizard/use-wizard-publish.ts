import { useState, useCallback } from 'react';
import { InstitutionSectionNamingRule } from '@sentinel/shared/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    createCourse,
    createDepartment,
    createInstitution,
    createSemester,
    createSubject,
    saveInstitutionNamingConventions,
} from '@sentinel/services';
import { useApi } from '@sentinel/hooks';
import type { WizardDraft } from '../../_types';
import { DRAFT_KEY, STEPS } from '../../_constants';
import { asErrorMessage } from '../../_utils';

export type UseWizardPublishArgs = {
    apiClient: ReturnType<typeof useApi>;
    draft: WizardDraft;
    validateStep: (step: number) => boolean;
    setActiveStep: (step: number) => void;
    setErrors: (errors: string[]) => void;
    setHasUnsavedProgress: (val: boolean) => void;
    onSuccess?: () => void;
};

export function useWizardPublish({
    apiClient,
    draft,
    validateStep,
    setActiveStep,
    setErrors,
    setHasUnsavedProgress,
    onSuccess,
}: UseWizardPublishArgs) {
    const router = useRouter();
    const [isPublishing, setIsPublishing] = useState(false);

    const publishSetup = useCallback(async () => {
        for (let step = 0; step < STEPS.length - 1; step += 1) {
            if (!validateStep(step)) {
                setActiveStep(step);
                return;
            }
        }

        setIsPublishing(true);
        setErrors([]);

        try {
            const institution = await createInstitution(apiClient, {
                name: draft.identity.name.trim(),
                code: draft.identity.code.trim(),
                institutionKind: draft.identity.institutionKind,
                parentInstitutionId:
                    draft.identity.institutionKind === 'CHILD'
                        ? draft.identity.parentInstitutionId
                        : null,
                namingConventions: {
                    roomCodeFormat: draft.naming.room.label,
                    sectionCodeFormat: null,
                    namingRules: {
                        room: {
                            label: draft.naming.room.label,
                            prefix: draft.naming.room.prefix,
                            virtualPrefix: draft.naming.room.virtualPrefix,
                        },
                        sectionRulesByCourseId: {}, // Will be updated after courses are created
                    },
                },
            });
            const institutionId = institution.id;
            const departmentIds = new Map<string, string>();
            const courseIds = new Map<string, string>();

            const departmentRows = draft.departments.filter((row) => row.name.trim());
            await Promise.all(
                departmentRows.map(async (department) => {
                    const created = await createDepartment(apiClient, {
                        name: department.name.trim(),
                        code: department.code.trim() || undefined,
                        institution_id: institutionId,
                    });
                    departmentIds.set(department.clientId, created.id);
                }),
            );

            const courseRows = draft.courses.filter((row) => row.title.trim());
            await Promise.all(
                courseRows.map(async (course) => {
                    const created = await createCourse(apiClient, {
                        title: course.title.trim(),
                        code: course.code.trim(),
                        departmentId: departmentIds.get(course.departmentClientId) ?? null,
                        description: null,
                        institution_id: institutionId,
                    });
                    courseIds.set(course.clientId, created.id);
                }),
            );

            const termRows = draft.terms.filter((row) => row.academicYear.trim());
            await Promise.all(
                termRows.map((term) =>
                    createSemester(apiClient, {
                        academic_year: term.academicYear.trim(),
                        semester: term.semester.trim(),
                        is_active: term.isActive,
                        start_date: term.startDate || null,
                        end_date: term.endDate || null,
                        institution_id: institutionId,
                    }),
                ),
            );

            const subjectRows = draft.subjects.filter((row) => row.title.trim());
            const batchSize = 20;
            for (let i = 0; i < subjectRows.length; i += batchSize) {
                const batch = subjectRows.slice(i, i + batchSize);
                await Promise.all(
                    batch.map((subject) =>
                        createSubject(apiClient, {
                            code: subject.code.trim(),
                            title: subject.title.trim(),
                            institution_id: institutionId,
                        }),
                    ),
                );
            }

            // Save finalized naming conventions with course IDs
            const sectionRulesByCourseId: Record<string, InstitutionSectionNamingRule> = {};
            for (const [courseClientId, rule] of Object.entries(
                draft.naming.sectionRulesByCourseClientId,
            )) {
                const realCourseId = courseIds.get(courseClientId);
                if (realCourseId) {
                    sectionRulesByCourseId[realCourseId] = {
                        courseId: realCourseId,
                        format: rule.format,
                        preview: rule.preview,
                    };
                }
            }

            await saveInstitutionNamingConventions(apiClient, {
                institutionId,
                payload: {
                    roomCodeFormat: draft.naming.room.label,
                    sectionCodeFormat: null,
                    namingRules: {
                        room: {
                            label: draft.naming.room.label,
                            prefix: draft.naming.room.prefix,
                            virtualPrefix: draft.naming.room.virtualPrefix,
                        },
                        sectionRulesByCourseId,
                    },
                },
            });

            window.localStorage.removeItem(DRAFT_KEY);
            setHasUnsavedProgress(false);
            toast.success('Institution template published');
            router.push('/institutions');
            onSuccess?.();
        } catch (error) {
            setErrors([asErrorMessage(error)]);
            toast.error('Institution setup publish failed');
        } finally {
            setIsPublishing(false);
            onSuccess?.();
        }
    }, [
        apiClient,
        draft,
        validateStep,
        setActiveStep,
        setErrors,
        setHasUnsavedProgress,
        router,
        onSuccess,
    ]);

    return {
        isPublishing,
        publishSetup,
    };
}
