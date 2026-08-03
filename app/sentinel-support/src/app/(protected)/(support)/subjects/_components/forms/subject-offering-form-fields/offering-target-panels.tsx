import { type SubjectOfferingFormFieldsProps } from './_types';
import {
    CoursePickerField,
    DepartmentPickerField,
    SectionPickerField,
    YearLevelPickerField,
} from './target-pickers';

interface OfferingTargetPanelsProps {
    form: SubjectOfferingFormFieldsProps['form'];
    isPending: boolean;
    filteredCoursesCount: number;
    departmentOptions: Array<{ value: string; label: string }>;
    courseOptions: Array<{ value: string; label: string }>;
    sectionOptions: Array<{ value: string; label: string }>;
    yearLevelOptions: Array<{ value: string; label: string }>;
    selectedDepartmentIds: string[];
    selectedCourseIds: string[];
    selectedYearLevels: number[];
    selectedSectionIds: string[];
    departmentSummary: string;
    courseSummary: string;
    yearLevelSummary: string;
    sectionSummary: string;
    isDepartmentLocked: boolean;
    isCourseLocked: boolean;
    departmentSearch: string;
    courseSearch: string;
    sectionSearch: string;
    onSetDepartmentIds: (departmentIds: string[]) => void;
    onSetCourseIds: (courseIds: string[]) => void;
    onSetSectionIds: (sectionIds: string[]) => void;
    onSetYearLevels: (yearLevels: number[]) => void;
    onSetDepartmentSearch: (value: string) => void;
    onSetCourseSearch: (value: string) => void;
    onSetSectionSearch: (value: string) => void;
    onToggleDepartment: (departmentId: string) => void;
    onToggleCourse: (courseId: string) => void;
    onToggleSection: (sectionId: string) => void;
    onToggleYearLevel: (yearLevel: number) => void;
}

export function OfferingTargetPanels({
    form,
    isPending,
    filteredCoursesCount,
    departmentOptions,
    courseOptions,
    sectionOptions,
    yearLevelOptions,
    selectedDepartmentIds,
    selectedCourseIds,
    selectedYearLevels,
    selectedSectionIds,
    departmentSummary,
    courseSummary,
    yearLevelSummary,
    sectionSummary,
    isDepartmentLocked,
    isCourseLocked,
    departmentSearch,
    courseSearch,
    sectionSearch,
    onSetDepartmentIds,
    onSetCourseIds,
    onSetSectionIds,
    onSetYearLevels,
    onSetDepartmentSearch,
    onSetCourseSearch,
    onSetSectionSearch,
    onToggleDepartment,
    onToggleCourse,
    onToggleSection,
    onToggleYearLevel,
}: OfferingTargetPanelsProps) {
    return (
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <DepartmentPickerField
                form={form}
                isPending={isPending}
                departmentOptions={departmentOptions}
                selectedDepartmentIds={selectedDepartmentIds}
                departmentSummary={departmentSummary}
                isLocked={isDepartmentLocked}
                searchValue={departmentSearch}
                visibleRows={11}
                onSearchChange={onSetDepartmentSearch}
                onSetDepartmentIds={onSetDepartmentIds}
                onToggleDepartment={onToggleDepartment}
            />

            <CoursePickerField
                form={form}
                isPending={isPending}
                filteredCoursesCount={filteredCoursesCount}
                courseOptions={courseOptions}
                selectedCourseIds={selectedCourseIds}
                courseSummary={courseSummary}
                isLocked={isCourseLocked}
                searchValue={courseSearch}
                visibleRows={11}
                onSearchChange={onSetCourseSearch}
                onSetCourseIds={onSetCourseIds}
                onToggleCourse={onToggleCourse}
            />

            <YearLevelPickerField
                form={form}
                isPending={isPending}
                yearLevelOptions={yearLevelOptions}
                selectedYearLevels={selectedYearLevels}
                yearLevelSummary={yearLevelSummary}
                visibleRows={11}
                onSetYearLevels={onSetYearLevels}
                onToggleYearLevel={onToggleYearLevel}
            />

            <SectionPickerField
                form={form}
                isPending={isPending}
                sectionOptions={sectionOptions}
                selectedSectionIds={selectedSectionIds}
                sectionSummary={sectionSummary}
                searchValue={sectionSearch}
                visibleRows={11}
                onSearchChange={onSetSectionSearch}
                onSetSectionIds={onSetSectionIds}
                onToggleSection={onToggleSection}
            />
        </div>
    );
}
