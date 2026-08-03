import { FormField, FormItem, FormMessage } from '@sentinel/ui';
import { FilterableCheckboxGroup } from '@/app/(protected)/(support)/subjects/_components/forms/filterable-checkbox-group';
import { type SubjectOfferingFormFieldsProps } from '../_types';

interface SectionPickerFieldProps {
    form: SubjectOfferingFormFieldsProps['form'];
    isPending: boolean;
    sectionOptions: Array<{ value: string; label: string }>;
    selectedSectionIds: string[];
    sectionSummary: string;
    searchValue: string;
    visibleRows?: number;
    onSearchChange: (value: string) => void;
    onSetSectionIds: (sectionIds: string[]) => void;
    onToggleSection: (sectionId: string) => void;
}

export function SectionPickerField({
    form,
    isPending,
    sectionOptions,
    selectedSectionIds,
    sectionSummary,
    searchValue,
    visibleRows = 11,
    onSearchChange,
    onSetSectionIds,
    onToggleSection,
}: SectionPickerFieldProps) {
    return (
        <FormField
            control={form.control}
            name="section_ids"
            render={() => (
                <FormItem className="h-full">
                    <FilterableCheckboxGroup
                        title="Sections"
                        searchPlaceholder="Filter sections..."
                        emptyMessage={
                            sectionOptions.length === 0
                                ? 'No sections match the selected department, course, and year levels.'
                                : 'No sections match your search.'
                        }
                        options={sectionOptions}
                        selectedValues={selectedSectionIds}
                        onToggle={onToggleSection}
                        helperText="Filtered by the department, course, and year you choose."
                        searchValue={searchValue}
                        onSearchChange={onSearchChange}
                        disableLocalFiltering
                        selectionSummary={sectionSummary}
                        visibleRows={visibleRows}
                        disabled={isPending}
                        onSetSelectedValues={onSetSectionIds}
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
