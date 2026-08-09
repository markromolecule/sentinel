import { useState, useCallback } from 'react';
import type { WizardDraft } from '../../_types';
import { STEPS } from '../../_constants';

export type UseWizardValidationArgs = {
    draft: WizardDraft;
    summary: {
        departments: number;
        courses: number;
        terms: number;
        subjects: number;
        namingConventions: number;
    };
};

export function useWizardValidation({ draft, summary }: UseWizardValidationArgs) {
    const [errors, setErrors] = useState<string[]>([]);

    const validateStep = useCallback(
        (step: number) => {
            const nextErrors: string[] = [];
            const stepName = STEPS[step];

            if (stepName === 'Identity') {
                if (!draft.identity.name.trim()) nextErrors.push('Institution name is required.');
                if (draft.identity.name.trim().length > 255)
                    nextErrors.push('Institution name must be 255 characters or less.');
                if (!draft.identity.code.trim()) nextErrors.push('Institution code is required.');
                if (draft.identity.code.trim().length > 50)
                    nextErrors.push('Institution code must be 50 characters or less.');
                if (
                    draft.identity.institutionKind === 'CHILD' &&
                    !draft.identity.parentInstitutionId
                ) {
                    nextErrors.push('Branch institutions must select a parent institution.');
                }
            }

            if (stepName === 'Departments') {
                if (summary.departments === 0) nextErrors.push('Add at least one department.');
                const invalidDept = draft.departments.some(
                    (dept) => dept.name.trim() && dept.name.trim().length > 100,
                );
                if (invalidDept)
                    nextErrors.push('Department names must be 100 characters or less.');
            }

            if (stepName === 'Courses') {
                const invalidCourse = draft.courses.some(
                    (course) =>
                        course.title.trim() &&
                        (!course.code.trim() || !course.departmentClientId.trim()),
                );
                const tooLongCourseCode = draft.courses.some(
                    (course) => course.code.trim().length > 20,
                );
                const tooLongCourseTitle = draft.courses.some(
                    (course) => course.title.trim().length > 255,
                );

                if (summary.courses === 0) nextErrors.push('Add at least one course.');
                if (invalidCourse)
                    nextErrors.push('Every course needs a code and department assignment.');
                if (tooLongCourseCode)
                    nextErrors.push('Course codes must be 20 characters or less.');
                if (tooLongCourseTitle)
                    nextErrors.push('Course titles must be 255 characters or less.');
            }

            if (stepName === 'Academic terms') {
                const invalidTerm = draft.terms.some(
                    (term) => term.academicYear.trim() && !term.semester.trim(),
                );
                if (summary.terms === 0) nextErrors.push('Add at least one academic term.');
                if (invalidTerm) nextErrors.push('Every academic year row needs a term name.');
            }

            if (stepName === 'Subjects') {
                const invalidSubject = draft.subjects.some(
                    (subject) => subject.title.trim() && !subject.code.trim(),
                );
                const tooLongCode = draft.subjects.some(
                    (subject) => subject.code.trim().length > 50,
                );
                const tooLongTitle = draft.subjects.some(
                    (subject) => subject.title.trim().length > 255,
                );

                if (summary.subjects === 0) nextErrors.push('Add at least one subject.');
                if (invalidSubject) nextErrors.push('Every subject needs a subject code.');
                if (tooLongCode) nextErrors.push('Subject codes must be 50 characters or less.');
                if (tooLongTitle) nextErrors.push('Subject titles must be 255 characters or less.');
            }

            if (stepName === 'Naming conventions') {
                if (!draft.naming.room.label.trim())
                    nextErrors.push('Room display label is required.');
                if (!draft.naming.room.prefix.trim())
                    nextErrors.push('Physical room prefix is required.');
            }

            setErrors(nextErrors);
            return nextErrors.length === 0;
        },
        [draft, summary],
    );

    return {
        errors,
        setErrors,
        validateStep,
    };
}
