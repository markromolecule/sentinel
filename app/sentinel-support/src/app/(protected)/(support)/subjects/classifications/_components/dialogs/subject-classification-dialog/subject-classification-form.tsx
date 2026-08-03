import { UseFormReturn } from 'react-hook-form';
import { type SubjectClassificationFormValues } from '@sentinel/shared/schema';
import {
    Button,
    Checkbox,
    DialogFooter,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@sentinel/ui';
import { Course, Department, Institution, MasterSubject } from '@sentinel/shared/types';
import { CourseSelectionField } from './_components/course-selection-field';
import { SubjectAssignmentSection } from './_components/subject-assignment-section';

const YEAR_LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6];

type SubjectClassificationFormProps = {
    form: UseFormReturn<SubjectClassificationFormValues>;
    onSubmit: (values: SubjectClassificationFormValues) => void;
    onCancel: () => void;
    isPending: boolean;
    institutions: Institution[];
    departments: Department[];
    filteredCourses: Course[];
    visibleSubjects: MasterSubject[];
    subjectSearch: string;
    onSearchChange: (value: string) => void;
    isCoreClassification: boolean;
    selectedInstitutionId: string | null;
    toggleSelected: (
        fieldValue: string[],
        nextValue: string,
        onChange: (value: string[]) => void,
    ) => void;
};

export function SubjectClassificationForm({
    form,
    onSubmit,
    onCancel,
    isPending,
    institutions,
    departments,
    filteredCourses,
    visibleSubjects,
    subjectSearch,
    onSearchChange,
    isCoreClassification,
    selectedInstitutionId,
    toggleSelected,
}: SubjectClassificationFormProps) {
    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex min-h-0 flex-1 flex-col gap-4"
            >
                <div className="grid min-h-0 flex-1 gap-6 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-4 overflow-y-auto pr-1">
                        <FormField
                            control={form.control}
                            name="institution_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Institution</FormLabel>
                                    <Select
                                        value={field.value ?? ''}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            form.setValue('department_id', null);
                                            form.setValue('course_ids', []);
                                            form.setValue('subject_ids', []);
                                            onSearchChange('');
                                        }}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select institution" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {institutions.map((institution) => (
                                                <SelectItem
                                                    key={institution.id}
                                                    value={institution.id}
                                                >
                                                    {institution.code
                                                        ? `${institution.code} - ${institution.name}`
                                                        : institution.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="General Subjects" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            if (value === 'GENERAL') {
                                                form.setValue('department_id', null);
                                                form.setValue('course_ids', []);
                                            }
                                        }}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="GENERAL">General</SelectItem>
                                            <SelectItem value="CORE">Core</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isCoreClassification ? (
                            <>
                                <FormField
                                    control={form.control}
                                    name="department_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Department</FormLabel>
                                            <Select
                                                value={field.value ?? '__all__'}
                                                onValueChange={(value) => {
                                                    field.onChange(
                                                        value === '__all__' ? null : value,
                                                    );
                                                    form.setValue('course_ids', []);
                                                }}
                                                disabled={!selectedInstitutionId}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="All departments" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="__all__">
                                                        All departments
                                                    </SelectItem>
                                                    {departments.map((department) => (
                                                        <SelectItem
                                                            key={department.id}
                                                            value={department.id}
                                                        >
                                                            {department.code ?? department.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <CourseSelectionField
                                    filteredCourses={filteredCourses}
                                    toggleSelected={toggleSelected}
                                />
                            </>
                        ) : null}

                        <FormField
                            control={form.control}
                            name="year_levels"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Year Levels</FormLabel>
                                    <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                        {YEAR_LEVEL_OPTIONS.map((yearLevel) => (
                                            <label
                                                key={yearLevel}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <Checkbox
                                                    checked={field.value.includes(yearLevel)}
                                                    disabled={isPending}
                                                    onCheckedChange={() =>
                                                        toggleSelected(
                                                            field.value.map(String),
                                                            String(yearLevel),
                                                            (values) =>
                                                                field.onChange(
                                                                    values
                                                                        .map(Number)
                                                                        .sort(
                                                                            (left, right) =>
                                                                                left - right,
                                                                        ),
                                                                ),
                                                        )
                                                    }
                                                />
                                                <span>Year {yearLevel}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <SubjectAssignmentSection
                        subjectSearch={subjectSearch}
                        onSearchChange={onSearchChange}
                        visibleSubjects={visibleSubjects}
                        selectedInstitutionId={selectedInstitutionId}
                        toggleSelected={toggleSelected}
                    />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
