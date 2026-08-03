import { FormField, FormItem, FormMessage } from '@sentinel/ui';
import { FilterableCheckboxGroup } from '@/app/(protected)/(support)/subjects/_components/forms/filterable-checkbox-group';
import { type SubjectOfferingFormFieldsProps } from '../_types';

interface CoursePickerFieldProps {
    form: SubjectOfferingFormFieldsProps['form'];
    isPending: boolean;
    filteredCoursesCount: number;
    courseOptions: Array<{ value: string; label: string }>;
    selectedCourseIds: string[];
    courseSummary: string;
    isLocked?: boolean;
    searchValue: string;
    visibleRows?: number;
    onSearchChange: (value: string) => void;
    onSetCourseIds: (courseIds: string[]) => void;
    onToggleCourse: (courseId: string) => void;
}

export function CoursePickerField({
    form,
    isPending,
    filteredCoursesCount,
    courseOptions,
    selectedCourseIds,
    courseSummary,
    isLocked = false,
    searchValue,
    visibleRows = 11,
    onSearchChange,
    onSetCourseIds,
    onToggleCourse,
}: CoursePickerFieldProps) {
    return (
        <FormField
            control={form.control}
            name="course_ids"
            render={() => (
                <FormItem className="h-full">
                    <FilterableCheckboxGroup
                        title="Courses"
                        searchPlaceholder="Filter courses..."
                        emptyMessage={
                            filteredCoursesCount === 0
                                ? 'No courses match the selected departments.'
                                : 'No courses match your search.'
                        }
                        options={courseOptions}
                        selectedValues={selectedCourseIds}
                        onToggle={onToggleCourse}
                        helperText={
                            isLocked
                                ? 'Your assigned course is fixed by your account.'
                                : 'Filtered by the departments you choose.'
                        }
                        searchValue={searchValue}
                        onSearchChange={onSearchChange}
                        disableLocalFiltering
                        selectionSummary={courseSummary}
                        visibleRows={visibleRows}
                        disabled={isPending || isLocked}
                        onSetSelectedValues={onSetCourseIds}
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
