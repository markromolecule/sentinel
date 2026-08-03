import { FormField, FormItem, FormMessage } from '@sentinel/ui';
import { FilterableCheckboxGroup } from '@/app/(protected)/(support)/subjects/_components/forms/filterable-checkbox-group';
import { type SubjectOfferingFormFieldsProps } from '../_types';

interface YearLevelPickerFieldProps {
    form: SubjectOfferingFormFieldsProps['form'];
    isPending: boolean;
    yearLevelOptions: Array<{ value: string; label: string }>;
    selectedYearLevels: number[];
    yearLevelSummary: string;
    visibleRows?: number;
    onSetYearLevels: (yearLevels: number[]) => void;
    onToggleYearLevel: (yearLevel: number) => void;
}

export function YearLevelPickerField({
    form,
    isPending,
    yearLevelOptions,
    selectedYearLevels,
    yearLevelSummary,
    visibleRows = 11,
    onSetYearLevels,
    onToggleYearLevel,
}: YearLevelPickerFieldProps) {
    return (
        <FormField
            control={form.control}
            name="year_levels"
            render={() => (
                <FormItem className="h-full">
                    <FilterableCheckboxGroup
                        title="Year Levels"
                        emptyMessage="No year levels available."
                        options={yearLevelOptions}
                        selectedValues={selectedYearLevels.map(String)}
                        onToggle={(value) => onToggleYearLevel(Number(value))}
                        helperText="Narrow automatically using the year levels you choose here."
                        selectionSummary={yearLevelSummary}
                        visibleRows={visibleRows}
                        disabled={isPending}
                        showSearch={false}
                        onSetSelectedValues={(values) =>
                            onSetYearLevels(
                                values
                                    .map((value) => Number(value))
                                    .sort((left, right) => left - right),
                            )
                        }
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
