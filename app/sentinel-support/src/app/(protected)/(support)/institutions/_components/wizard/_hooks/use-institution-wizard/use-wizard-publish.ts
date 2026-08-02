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
    updateInstitution,
    updateSubject,
} from '@sentinel/services';
import { useApi } from '@sentinel/hooks';
import type { WizardDraft, WizardSubject } from '../../_types';
import { DRAFT_KEY, STEPS } from '../../_constants';
import { asErrorMessage } from '../../_utils';

export type UseWizardPublishArgs = {
    apiClient: ReturnType<typeof useApi>;
    draft: WizardDraft;
    editInstitutionId?: string;
    validateStep: (step: number) => boolean;
    setActiveStep: (step: number) => void;
    setErrors: (errors: string[]) => void;
    setHasUnsavedProgress: (val: boolean) => void;
    onSuccess?: () => void;
};

const SUBJECT_BATCH_SIZE = 20;

function getPersistedSubjectId(subject: WizardSubject) {
    if (subject.persistedId) {
        return subject.persistedId;
    }

    if (subject.isInherited !== undefined || subject.sourceRecordId !== undefined) {
        return subject.clientId;
    }

    return null;
}

function hasSubjectChanged(subject: WizardSubject) {
    return (
        subject.initialCode === undefined ||
        subject.initialTitle === undefined ||
        subject.code.trim() !== subject.initialCode.trim() ||
        subject.title.trim() !== subject.initialTitle.trim()
    );
}

async function syncExistingInstitutionSubjects(
    apiClient: ReturnType<typeof useApi>,
    institutionId: string,
    subjects: WizardSubject[],
) {
    const subjectRows = subjects.filter((row) => row.code.trim() && row.title.trim());

    for (let i = 0; i < subjectRows.length; i += SUBJECT_BATCH_SIZE) {
        const batch = subjectRows.slice(i, i + SUBJECT_BATCH_SIZE);
        await Promise.all(
            batch.map((subject) => {
                const persistedSubjectId = getPersistedSubjectId(subject);
                const payload = {
                    code: subject.code.trim(),
                    title: subject.title.trim(),
                    institution_id: institutionId,
                };

                if (persistedSubjectId) {
                    if (!hasSubjectChanged(subject)) {
                        return Promise.resolve();
                    }

                    return updateSubject(apiClient, {
                        id: persistedSubjectId,
                        payload,
                    });
                }

                return createSubject(apiClient, payload);
            }),
        );
    }
}

export function useWizardPublish({
    apiClient,
    draft,
    editInstitutionId,
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
            const isEditing = !!editInstitutionId || !!draft.identity.id;
            let institutionId = editInstitutionId || draft.identity.id || '';

            if (isEditing) {
                await updateInstitution(apiClient, {
                    id: institutionId,
                    payload: {
                        name: draft.identity.name.trim(),
                        code: draft.identity.code.trim(),
                        institutionKind: draft.identity.institutionKind,
                        parentInstitutionId:
                            draft.identity.institutionKind === 'CHILD'
                                ? draft.identity.parentInstitutionId
                                : null,
                    },
                });
            } else {
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
                            sectionRulesByCourseId: {},
                        },
                    },
                });
                institutionId = institution.id;
            }

            if (!isEditing) {
                // Only create related entities if NOT editing
                // In Edit mode, these should be managed in their respective pages
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
            } else {
                // If editing, at least update naming conventions
                // Mapping clientId back to real IDs if they were loaded
                await syncExistingInstitutionSubjects(apiClient, institutionId, draft.subjects);

                const sectionRulesByCourseId: Record<string, InstitutionSectionNamingRule> = {};
                for (const [courseClientId, rule] of Object.entries(
                    draft.naming.sectionRulesByCourseClientId,
                )) {
                    sectionRulesByCourseId[courseClientId] = {
                        courseId: courseClientId,
                        format: rule.format,
                        preview: rule.preview,
                    };
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
            }

            window.localStorage.removeItem(DRAFT_KEY);
            setHasUnsavedProgress(false);
            toast.success(isEditing ? 'Institution updated' : 'Institution template published');

            if (!isEditing) {
                router.push('/institutions');
                onSuccess?.();
            } else {
                onSuccess?.();
            }
        } catch (error) {
            setErrors([asErrorMessage(error)]);
            toast.error('Institution setup publish failed');
        } finally {
            setIsPublishing(false);
        }
    }, [
        apiClient,
        draft,
        editInstitutionId,
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
