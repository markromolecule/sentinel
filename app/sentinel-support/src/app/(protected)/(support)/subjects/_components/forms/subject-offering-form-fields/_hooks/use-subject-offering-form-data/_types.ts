import { type Course, type Semester, type MasterSubject } from '@sentinel/shared/types';
import { type FilterableCheckboxOption } from '@/app/(protected)/(support)/subjects/_components/forms/filterable-checkbox-group';
import { type SubjectOfferingFormFieldsProps } from '../../_types';

export type UseSubjectOfferingFormDataArgs = Pick<
    SubjectOfferingFormFieldsProps,
    'form' | 'subjectToOffer' | 'open'
> & {
    institutionId?: string | null;
};

export type UseSubjectOfferingFormDataReturn = {
    subjects: MasterSubject[];
    semesters: Semester[];
    filteredCourses: Course[];
    departmentOptions: FilterableCheckboxOption[];
    courseOptions: FilterableCheckboxOption[];
    sectionOptions: FilterableCheckboxOption[];
    yearLevelOptions: FilterableCheckboxOption[];
    selectedDepartmentIds: string[];
    selectedCourseIds: string[];
    selectedYearLevels: number[];
    selectedSectionIds: string[];
    selectedDepartments: string[];
    selectedCourses: string[];
    selectedSections: string[];
    selectedYearLevelLabels: string[];
    selectedSubjectLabel: string;
    selectedTermLabel: string;
    selectedTermDates: string | null;
    departmentSummary: string;
    courseSummary: string;
    yearLevelSummary: string;
    sectionSummary: string;
    isDepartmentLocked: boolean;
    isCourseLocked: boolean;
    departmentSearch: string;
    courseSearch: string;
    sectionSearch: string;
    setDepartmentIds: (values: string[]) => void;
    setCourseIds: (values: string[]) => void;
    setSectionIds: (values: string[]) => void;
    setYearLevels: (values: number[]) => void;
    setDepartmentSearch: (value: string) => void;
    setCourseSearch: (value: string) => void;
    setSectionSearch: (value: string) => void;
    toggleDepartment: (departmentId: string) => void;
    toggleCourse: (courseId: string) => void;
    toggleSection: (sectionId: string) => void;
    toggleYearLevel: (yearLevel: number) => void;
};
