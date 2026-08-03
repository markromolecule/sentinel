'use client';

import { type SubjectOfferingFormFieldsProps } from './_types';
import { OfferingDetailsSection } from './offering-details-section';
import { SelectionOverviewSection } from './selection-overview-section';
import { OfferingTargetPanels } from './offering-target-panels';
import { useSubjectOfferingFormData } from './_hooks/use-subject-offering-form-data';

export function SubjectOfferingFormFields({
    form,
    isPending,
    subjectToOffer,
    open = false,
}: SubjectOfferingFormFieldsProps) {
    const offeringFormData = useSubjectOfferingFormData({
        form,
        subjectToOffer,
        open,
    });

    return (
        <div className="grid gap-4 2xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,2.2fr)]">
            <div className="space-y-4">
                <OfferingDetailsSection
                    form={form}
                    isPending={isPending}
                    subjectToOffer={subjectToOffer}
                    subjects={offeringFormData.subjects}
                    semesters={offeringFormData.semesters}
                />

                <SelectionOverviewSection
                    selectedSubjectLabel={offeringFormData.selectedSubjectLabel}
                    selectedTermLabel={offeringFormData.selectedTermLabel}
                    selectedTermDates={offeringFormData.selectedTermDates}
                    selectedDepartments={offeringFormData.selectedDepartments}
                    selectedCourses={offeringFormData.selectedCourses}
                    selectedYearLevelLabels={offeringFormData.selectedYearLevelLabels}
                    selectedSections={offeringFormData.selectedSections}
                />
            </div>

            <OfferingTargetPanels
                form={form}
                isPending={isPending}
                filteredCoursesCount={offeringFormData.filteredCourses.length}
                departmentOptions={offeringFormData.departmentOptions}
                courseOptions={offeringFormData.courseOptions}
                sectionOptions={offeringFormData.sectionOptions}
                yearLevelOptions={offeringFormData.yearLevelOptions}
                selectedDepartmentIds={offeringFormData.selectedDepartmentIds}
                selectedCourseIds={offeringFormData.selectedCourseIds}
                selectedYearLevels={offeringFormData.selectedYearLevels}
                selectedSectionIds={offeringFormData.selectedSectionIds}
                departmentSummary={offeringFormData.departmentSummary}
                courseSummary={offeringFormData.courseSummary}
                yearLevelSummary={offeringFormData.yearLevelSummary}
                sectionSummary={offeringFormData.sectionSummary}
                isDepartmentLocked={offeringFormData.isDepartmentLocked}
                isCourseLocked={offeringFormData.isCourseLocked}
                departmentSearch={offeringFormData.departmentSearch}
                courseSearch={offeringFormData.courseSearch}
                sectionSearch={offeringFormData.sectionSearch}
                onSetDepartmentIds={offeringFormData.setDepartmentIds}
                onSetCourseIds={offeringFormData.setCourseIds}
                onSetSectionIds={offeringFormData.setSectionIds}
                onSetYearLevels={offeringFormData.setYearLevels}
                onSetDepartmentSearch={offeringFormData.setDepartmentSearch}
                onSetCourseSearch={offeringFormData.setCourseSearch}
                onSetSectionSearch={offeringFormData.setSectionSearch}
                onToggleDepartment={offeringFormData.toggleDepartment}
                onToggleCourse={offeringFormData.toggleCourse}
                onToggleSection={offeringFormData.toggleSection}
                onToggleYearLevel={offeringFormData.toggleYearLevel}
            />
        </div>
    );
}
