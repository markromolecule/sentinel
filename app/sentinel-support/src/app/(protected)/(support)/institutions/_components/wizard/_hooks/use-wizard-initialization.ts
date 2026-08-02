import { useEffect, useRef } from 'react';
import {
    useDepartmentsQuery,
    useCoursesQuery,
    useSemestersQuery,
    useSubjectsQuery,
    useEffectiveInstitutionNamingConventionsQuery,
} from '@sentinel/hooks';
import { Institution } from '@sentinel/shared/types';
import { WizardDraft } from '../_types';
import { formatDateForInput } from '@/lib/date-utils';

export type UseWizardInitializationArgs = {
    open: boolean;
    institution?: Institution;
    setDraft: (draft: WizardDraft) => void;
};

export function useWizardInitialization({
    open,
    institution,
    setDraft,
}: UseWizardInitializationArgs) {
    const hasInitialized = useRef(false);

    const { data: depts = [], isLoading: isLoadingDepts } = useDepartmentsQuery({
        search: '',
        institutionId: institution?.id,
        enabled: !!institution?.id && open,
    });
    const { data: courses = [], isLoading: isLoadingCourses } = useCoursesQuery({
        search: '',
        institutionId: institution?.id,
        enabled: !!institution?.id && open,
    });
    const { data: terms = [], isLoading: isLoadingTerms } = useSemestersQuery({
        search: '',
        institutionId: institution?.id,
        enabled: !!institution?.id && open,
    });
    const { data: subjects = [], isLoading: isLoadingSubjects } = useSubjectsQuery({
        search: '',
        institutionId: institution?.id,
        enabled: !!institution?.id && open,
    });
    const { data: namingData, isLoading: isLoadingNaming } =
        useEffectiveInstitutionNamingConventionsQuery(institution?.id);

    const isInitialDataLoading =
        isLoadingDepts ||
        isLoadingCourses ||
        isLoadingTerms ||
        isLoadingSubjects ||
        isLoadingNaming;

    useEffect(() => {
        if (open && institution && !hasInitialized.current && !isInitialDataLoading) {
            const draftData: WizardDraft = {
                identity: {
                    id: institution.id,
                    name: institution.name,
                    code: institution.code || '',
                    institutionKind: institution.institutionKind || 'STANDALONE',
                    parentInstitutionId: institution.parentInstitutionId || '',
                },
                departments: depts.map((d) => ({
                    clientId: d.id,
                    name: d.name,
                    code: d.code || '',
                    isInherited: d.isInherited,
                    sourceRecordId: d.sourceRecordId || null,
                })),
                courses: courses.map((c) => ({
                    clientId: c.id || '',
                    title: c.title,
                    code: c.code,
                    departmentClientId: c.departmentId || '',
                    isInherited: c.isInherited,
                    sourceRecordId: c.sourceRecordId || null,
                })),
                terms: terms.map((t) => ({
                    clientId: t.id || '',
                    academicYear: t.academicYear,
                    semester: t.semester,
                    isActive: t.isActive,
                    startDate: formatDateForInput(t.startDate),
                    endDate: formatDateForInput(t.endDate),
                })),
                subjects: subjects.map((s) => ({
                    clientId: s.id || '',
                    persistedId: s.id || null,
                    code: s.code,
                    title: s.title,
                    initialCode: s.code,
                    initialTitle: s.title,
                    isInherited: s.isInherited,
                    sourceRecordId: s.sourceRecordId || null,
                })),
                naming: {
                    room: namingData?.namingRules.room || {
                        label: 'Room',
                        prefix: 'R',
                        virtualPrefix: 'V',
                    },
                    sectionRulesByCourseClientId:
                        namingData?.namingRules.sectionRulesByCourseId || {},
                },
            };

            setDraft(draftData);
            hasInitialized.current = true;
        }
    }, [
        open,
        institution,
        isInitialDataLoading,
        depts,
        courses,
        terms,
        subjects,
        namingData,
        setDraft,
    ]);

    useEffect(() => {
        if (!open) {
            hasInitialized.current = false;
        }
    }, [open]);

    return {
        isInitialDataLoading,
    };
}
