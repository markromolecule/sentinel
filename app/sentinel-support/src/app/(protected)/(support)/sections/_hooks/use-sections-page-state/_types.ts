import { SectionFormValues } from '@sentinel/shared/schema';
import { Section } from '@sentinel/shared/types';

export type SectionPageState = {
    searchTerm: string;
    selectedInstitutionId: string;
    formOpen: boolean;
    editingSectionId: string | null;
    sectionToRevert: Section | null;
};

export const DEFAULT_SECTION_FORM_VALUES: SectionFormValues = {
    institution_id: '',
    name: '',
    department_id: '',
    course_id: '',
    year_level: undefined,
};
