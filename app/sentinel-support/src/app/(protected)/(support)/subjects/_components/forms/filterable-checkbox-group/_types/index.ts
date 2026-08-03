export interface FilterableCheckboxOption {
    value: string;
    label: string;
}

export interface FilterableCheckboxGroupProps {
    title: string;
    searchPlaceholder?: string;
    emptyMessage: string;
    options: FilterableCheckboxOption[];
    selectedValues: string[];
    onToggle: (value: string) => void;
    helperText?: string;
    selectionSummary?: string;
    visibleRows?: number;
    disabled?: boolean;
    showSearch?: boolean;
    onSetSelectedValues?: (values: string[]) => void;
    variant?: 'default' | 'compact';
    headerDensity?: 'default' | 'compact';
    listClassName?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    disableLocalFiltering?: boolean;
}
