import { useMemo } from 'react';
import { useApi, useInstitutionsQuery } from '@sentinel/hooks';
import { countCompleteRows } from '../../_utils';
import type { WizardDepartment, WizardCourse, WizardTerm, WizardSubject } from '../../_types';
import { useWizardDraft } from './use-wizard-draft';
import { useWizardNavigation } from './use-wizard-navigation';
import { useWizardValidation } from './use-wizard-validation';
import { useWizardSubjectImport } from './use-wizard-subject-import';
import { useWizardPublish } from './use-wizard-publish';

export function useInstitutionWizard(
    args: { editInstitutionId?: string; onSuccess?: () => void } = {},
) {
    const apiClient = useApi();
    const { data: institutions = [] } = useInstitutionsQuery();

    const {
        draft,
        setDraft,
        updateDraft,
        saveDraft,
        lastSavedAt,
        hasUnsavedProgress,
        setHasUnsavedProgress,
    } = useWizardDraft();

    const summary = useMemo(
        () => ({
            departments: countCompleteRows(draft.departments, (row: WizardDepartment) =>
                Boolean(row.name.trim()),
            ),
            courses: countCompleteRows(
                draft.courses,
                (row: WizardCourse) => Boolean(row.title.trim()) && Boolean(row.code.trim()),
            ),
            terms: countCompleteRows(
                draft.terms,
                (row: WizardTerm) =>
                    Boolean(row.academicYear.trim()) && Boolean(row.semester.trim()),
            ),
            subjects: countCompleteRows(
                draft.subjects,
                (row: WizardSubject) => Boolean(row.code.trim()) && Boolean(row.title.trim()),
            ),
            namingConventions: Object.keys(draft.naming.sectionRulesByCourseClientId).length + 1,
        }),
        [draft],
    );

    const { errors, setErrors, validateStep } = useWizardValidation({
        draft,
        summary,
    });

    const { activeStep, setActiveStep, goNext, goBack, handleCancel } = useWizardNavigation({
        hasUnsavedProgress,
        validateStep,
    });

    const {
        subjectBulkInput,
        setSubjectBulkInput,
        subjectFileName,
        setSubjectFileName,
        activeSubjectPreview,
        isParsingSubjects,
        handleSubjectFileChange,
        setSubjectFilePreview,
        applySubjectBulkRows,
    } = useWizardSubjectImport({
        updateDraft,
    });

    const { isPublishing, publishSetup } = useWizardPublish({
        apiClient,
        draft,
        editInstitutionId: args.editInstitutionId,
        validateStep,
        setActiveStep,
        setErrors,
        setHasUnsavedProgress,
        onSuccess: args.onSuccess,
    });

    return {
        activeStep,
        draft,
        errors,
        isPublishing,
        lastSavedAt,
        hasUnsavedProgress,
        summary,
        institutions,
        subjectBulkInput,
        subjectFileName,
        activeSubjectPreview,
        isParsingSubjects,
        setActiveStep,
        setErrors,
        setDraft,
        updateDraft,
        saveDraft,
        goNext,
        goBack,
        handleCancel,
        publishSetup,
        handleSubjectFileChange,
        setSubjectFilePreview,
        applySubjectBulkRows,
        setSubjectBulkInput,
        setSubjectFileName,
    };
}
