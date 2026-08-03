import { type FilterableCheckboxOption } from '@/app/(protected)/(support)/subjects/_components/forms/filterable-checkbox-group';

export function getCourseDepartmentId(course: {
    departmentId?: string | null;
    department?: string;
}) {
    return course.departmentId ?? course.department ?? null;
}

export function mapSelectedLabels(
    selectedIds: string[] | undefined,
    labelMap: Map<string, string>,
) {
    if (!selectedIds?.length) {
        return [];
    }

    return selectedIds
        .map((selectedId) => labelMap.get(selectedId))
        .filter((value): value is string => Boolean(value));
}

export function toggleStringListValue(
    currentValues: string[] | undefined,
    nextValue: string,
    onChange: (values: string[]) => void,
) {
    const safeValues = currentValues ?? [];
    const nextValues = safeValues.includes(nextValue)
        ? safeValues.filter((value) => value !== nextValue)
        : [...safeValues, nextValue];

    onChange(nextValues);
}

export function mergeOptionsWithSelected(
    options: FilterableCheckboxOption[],
    selectedValues: string[] | undefined,
    knownLabels: Record<string, string>,
) {
    const mergedOptions = new Map(options.map((option) => [option.value, option]));

    (selectedValues ?? []).forEach((value) => {
        if (!mergedOptions.has(value) && knownLabels[value]) {
            mergedOptions.set(value, {
                value,
                label: knownLabels[value],
            });
        }
    });

    return Array.from(mergedOptions.values());
}
