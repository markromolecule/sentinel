import { useMemo } from 'react';
import { useApi, useInstitutionsQuery } from '@sentinel/hooks';
import { countCompleteRows } from '../../_utils';
import { useWizardDraft } from './use-wizard-draft';
import { useWizardNavigation } from './use-wizard-navigation';
import { useWizardValidation } from './use-wizard-validation';
import { useWizardSubjectImport } from './use-wizard-subject-import';
import { useWizardPublish } from './use-wizard-publish';

export function useInstitutionWizard(args: { onSuccess?: () => void } = {}) {
    const apiClient = useApi();
    const { data: institutions = [] } = useInstitutionsQuery();

    const {
        draft,
        updateDraft,
        saveDraft,
        lastSavedAt,
        hasUnsavedProgress,
        setHasUnsavedProgress,
    } = useWizardDraft();

    const summary = useMemo(
        () => ({
            departments: countCompleteRows(draft.departments, (row) => Boolean(row.name.trim())),
            courses: countCompleteRows(
                draft.courses,
                (row) => Boolean(row.title.trim()) && Boolean(row.code.trim()),
            ),
            terms: countCompleteRows(
                draft.terms,
                (row) => Boolean(row.academicYear.trim()) && Boolean(row.semester.trim()),
            ),
            subjects: countCompleteRows(
                draft.subjects,
                (row) => Boolean(row.code.trim()) && Boolean(row.title.trim()),
            ),
            namingConventions: Object.keys(draft.naming.sectionRulesByCourseClientId).length,
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
        setSubjectFileName,
        activeSubjectPreview,
        isParsingSubjects,
        setActiveStep,
        setErrors,
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
    };
}
