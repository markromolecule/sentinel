import { type KeyboardEvent, type WheelEvent, useState } from 'react';
import { useStableValue } from '@sentinel/hooks';
import { ROW_HEIGHT_PX, LIST_VERTICAL_PADDING_PX } from '../../_constants';
import type { UseFilterableCheckboxGroupArgs, UseFilterableCheckboxGroupReturn } from './_types';

export function useFilterableCheckboxGroup({
    options,
    selectedValues,
    searchValue,
    onSearchChange,
    disableLocalFiltering,
    onSetSelectedValues,
    visibleRows,
}: UseFilterableCheckboxGroupArgs): UseFilterableCheckboxGroupReturn {
    const [internalSearch, setInternalSearch] = useState('');
    const search = searchValue ?? internalSearch;

    const filteredOptions = useStableValue(() => {
        if (disableLocalFiltering) {
            return options;
        }

        const query = search.trim().toLowerCase();
        if (!query) {
            return options;
        }

        return options.filter((option) => option.label.toLowerCase().includes(query));
    }, [options, search, disableLocalFiltering]);

    const selectedSet = useStableValue(() => new Set(selectedValues), [selectedValues]);

    const filteredValueSet = useStableValue(
        () => new Set(filteredOptions.map((option) => option.value)),
        [filteredOptions],
    );

    const viewportRows =
        filteredOptions.length === 0 ? 3 : Math.min(filteredOptions.length, visibleRows);

    const minListHeight = viewportRows * ROW_HEIGHT_PX + LIST_VERTICAL_PADDING_PX * 2;

    const allFilteredSelected =
        filteredOptions.length > 0 &&
        filteredOptions.every((option) => selectedSet.has(option.value));

    function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const { currentTarget, key } = event;

        switch (key) {
            case 'ArrowDown':
                event.preventDefault();
                currentTarget.scrollBy({ top: ROW_HEIGHT_PX });
                break;
            case 'ArrowUp':
                event.preventDefault();
                currentTarget.scrollBy({ top: -ROW_HEIGHT_PX });
                break;
            case 'PageDown':
                event.preventDefault();
                currentTarget.scrollBy({ top: currentTarget.clientHeight });
                break;
            case 'PageUp':
                event.preventDefault();
                currentTarget.scrollBy({ top: -currentTarget.clientHeight });
                break;
            case 'Home':
                event.preventDefault();
                currentTarget.scrollTo({ top: 0 });
                break;
            case 'End':
                event.preventDefault();
                currentTarget.scrollTo({ top: currentTarget.scrollHeight });
                break;
        }
    }

    function handleListWheel(event: WheelEvent<HTMLDivElement>) {
        const { currentTarget, deltaY } = event;

        if (currentTarget.scrollHeight <= currentTarget.clientHeight) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        currentTarget.scrollTop += deltaY;
    }

    function handleSelectAllToggle() {
        if (!onSetSelectedValues || filteredOptions.length === 0) {
            return;
        }

        if (allFilteredSelected) {
            onSetSelectedValues(selectedValues.filter((value) => !filteredValueSet.has(value)));
            return;
        }

        const nextValues = new Set(selectedValues);
        filteredOptions.forEach((option) => nextValues.add(option.value));
        onSetSelectedValues(Array.from(nextValues));
    }

    function handleSearchChange(value: string) {
        if (onSearchChange) {
            onSearchChange(value);
            return;
        }

        setInternalSearch(value);
    }

    return {
        search,
        filteredOptions,
        selectedSet,
        allFilteredSelected,
        minListHeight,
        handleSearchChange,
        handleListKeyDown,
        handleListWheel,
        handleSelectAllToggle,
    };
}
