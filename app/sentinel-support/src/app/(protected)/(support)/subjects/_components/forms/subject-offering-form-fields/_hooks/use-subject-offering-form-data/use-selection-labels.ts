import { useState, useCallback } from 'react';
import { type FilterableCheckboxOption } from '@/app/(protected)/(support)/subjects/_components/forms/filterable-checkbox-group';

export function useSelectionLabels(options: FilterableCheckboxOption[]) {
    const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>({});

    const rememberLabels = useCallback(
        (values: string[]) => {
            if (values.length === 0) {
                return;
            }

            setSelectedLabels((current) => {
                const next = { ...current };
                const availableLabelMap = new Map(
                    options.map((option) => [option.value, option.label]),
                );

                values.forEach((value) => {
                    const label = availableLabelMap.get(value);

                    if (label) {
                        next[value] = label;
                    }
                });

                return next;
            });
        },
        [options],
    );

    return {
        selectedLabels,
        rememberLabels,
    };
}
