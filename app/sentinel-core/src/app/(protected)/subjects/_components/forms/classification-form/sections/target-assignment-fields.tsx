import { useFormContext, useWatch } from 'react-hook-form';
import {
    Checkbox,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@sentinel/ui';
import { type SubjectClassificationFormValues } from '@sentinel/shared/schema';
import { FilterableCheckboxGroup } from '@/app/(protected)/subjects/_components/forms/filterable-checkbox-group';
import { useClassificationOptions } from '../hooks/use-classification-options';
import { useDebounce, useCoursesQuery } from '@sentinel/hooks';
import { useState } from 'react';

interface TargetAssignmentFieldsProps {
    isPending: boolean;
}

const YEAR_LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6];

export function TargetAssignmentFields({ isPending }: TargetAssignmentFieldsProps) {
    const { control, setValue } = useFormContext<SubjectClassificationFormValues>();
    const classificationType = useWatch({ control, name: 'type' });
    const [courseSearch, setCourseSearch] = useState('');
    const [selectedCourseLabels, setSelectedCourseLabels] = useState<Record<string, string>>({});
    const debouncedCourseSearch = useDebounce(courseSearch, 400);

    const { isAdmin, deptOptions, courseSummary, isLoadingDepts } = useClassificationOptions();

    const selectedDepartmentId = useWatch({ control, name: 'department_id' });
    const selectedCourseIds = useWatch({ control, name: 'course_ids' }) ?? [];
    const selectedYearLevels = useWatch({ control, name: 'year_levels' }) ?? [];
    const shouldQueryCourses = classificationType === 'CORE' && Boolean(selectedDepartmentId);
    const { data: courseData = [], isLoading: isLoadingCourses } = useCoursesQuery({
        search: debouncedCourseSearch || undefined,
        enabled: shouldQueryCourses,
    });

    const filteredCourseOptions = courseData
        .filter((course) => (course.department_id ?? course.departmentId) === selectedDepartmentId)
        .map((course) => ({
            value: course.course_id ?? course.id,
            label: `${course.code} - ${course.title}`,
        }));

    const knownCourseOptions = new Map(
        filteredCourseOptions.map((option) => [option.value, option]),
    );

    selectedCourseIds.forEach((courseId) => {
        if (!knownCourseOptions.has(courseId) && selectedCourseLabels[courseId]) {
            knownCourseOptions.set(courseId, {
                value: courseId,
                label: selectedCourseLabels[courseId],
            });
        }
    });

    const mergedCourseOptions = Array.from(knownCourseOptions.values());

    function rememberCourseLabels(ids: string[]) {
        if (ids.length === 0) {
            return;
        }

        setSelectedCourseLabels((current) => {
            const next = { ...current };
            const availableLabelMap = new Map(
                filteredCourseOptions.map((option) => [option.value, option.label]),
            );

            ids.forEach((id) => {
                const label = availableLabelMap.get(id);

                if (label) {
                    next[id] = label;
                }
            });

            return next;
        });
    }

    return (
        <div className="border-primary/10 bg-muted/10 space-y-4 rounded-2xl border p-4">
            {classificationType === 'CORE' ? (
                <>
                    <FormField
                        control={control}
                        name="department_id"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-foreground/50 text-[12px] font-bold tracking-wider uppercase">
                                    Target Department
                                </FormLabel>
                                <Select
                                    value={field.value ?? ''}
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                        setValue('course_ids', []);
                                    }}
                                    disabled={isAdmin || isPending || isLoadingDepts}
                                >
                                    <FormControl>
                                        <SelectTrigger className="bg-background/50 border-muted-foreground/20 focus:ring-primary/20 h-10">
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {deptOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-1.5">
                        <FormLabel className="text-foreground/50 text-[12px] font-bold tracking-wider uppercase">
                            Target Courses
                        </FormLabel>
                        <FilterableCheckboxGroup
                            title="Courses"
                            searchPlaceholder="Search courses..."
                            emptyMessage={
                                isLoadingCourses
                                    ? 'Loading courses...'
                                    : 'No courses found under the selected department.'
                            }
                            options={mergedCourseOptions}
                            selectedValues={selectedCourseIds}
                            onToggle={(courseId) => {
                                if (isAdmin) return;
                                const nextValue = selectedCourseIds.includes(courseId)
                                    ? selectedCourseIds.filter((v) => v !== courseId)
                                    : [...selectedCourseIds, courseId];
                                rememberCourseLabels(nextValue);
                                setValue('course_ids', nextValue, {
                                    shouldDirty: true,
                                });
                            }}
                            onSetSelectedValues={(vals) => {
                                if (isAdmin) return;
                                rememberCourseLabels(vals);
                                setValue('course_ids', vals, {
                                    shouldDirty: true,
                                });
                            }}
                            disabled={isAdmin || isPending || isLoadingCourses}
                            selectionSummary={courseSummary}
                            helperText={
                                isAdmin
                                    ? 'Fixed to your assignment'
                                    : 'Available under the selected department'
                            }
                            searchValue={courseSearch}
                            onSearchChange={(value) => {
                                rememberCourseLabels(selectedCourseIds);
                                setCourseSearch(value);
                            }}
                            disableLocalFiltering
                            variant="compact"
                            headerDensity="compact"
                            listClassName="max-h-[220px]"
                        />
                    </div>
                </>
            ) : null}

            <div className="space-y-1.5">
                <FormLabel className="text-foreground/50 text-[12px] font-bold tracking-wider uppercase">
                    Year Levels
                </FormLabel>
                <div className="grid grid-cols-2 gap-2">
                    {YEAR_LEVEL_OPTIONS.map((yearLevel) => (
                        <label
                            key={yearLevel}
                            className="bg-background/50 border-muted-foreground/20 flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
                        >
                            <Checkbox
                                checked={selectedYearLevels.includes(yearLevel)}
                                disabled={isPending}
                                onCheckedChange={() => {
                                    const nextValue = selectedYearLevels.includes(yearLevel)
                                        ? selectedYearLevels.filter((value) => value !== yearLevel)
                                        : [...selectedYearLevels, yearLevel];

                                    setValue(
                                        'year_levels',
                                        nextValue.sort((left, right) => left - right),
                                        {
                                            shouldDirty: true,
                                        },
                                    );
                                }}
                            />
                            <span>Year {yearLevel}</span>
                        </label>
                    ))}
                </div>
                <p className="text-muted-foreground text-xs">
                    Optional. Leave blank when this classification applies to all year levels.
                </p>
            </div>
        </div>
    );
}
