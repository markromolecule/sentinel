import type { KeyboardEvent, WheelEvent } from 'react';
import type { FilterableCheckboxOption } from '../../_types';

export interface UseFilterableCheckboxGroupArgs {
    options: FilterableCheckboxOption[];
    selectedValues: string[];
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    disableLocalFiltering?: boolean;
    onSetSelectedValues?: (values: string[]) => void;
    visibleRows: number;
}

export interface UseFilterableCheckboxGroupReturn {
    search: string;
    filteredOptions: FilterableCheckboxOption[];
    selectedSet: Set<string>;
    allFilteredSelected: boolean;
    minListHeight: number;
    handleSearchChange: (value: string) => void;
    handleListKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handleListWheel: (event: WheelEvent<HTMLDivElement>) => void;
    handleSelectAllToggle: () => void;
}
