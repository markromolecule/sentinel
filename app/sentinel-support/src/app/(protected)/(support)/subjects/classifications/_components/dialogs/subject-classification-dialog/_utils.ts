import { type SubjectClassificationFormValues } from '@sentinel/shared/schema';
import { SubjectClassification } from '@sentinel/shared/types';

export function toDefaultValues(
    classification: SubjectClassification | null,
): SubjectClassificationFormValues {
    return {
        name: classification?.name ?? '',
        type: classification?.type ?? 'GENERAL',
        description: classification?.description ?? '',
        subject_ids: classification?.subjects.map((subject) => subject.id) ?? [],
        department_id: classification?.department_id ?? null,
        course_ids: classification?.course_ids ?? [],
        year_levels: classification?.year_levels ?? [],
        institution_id: classification?.institution_id ?? null,
    };
}
