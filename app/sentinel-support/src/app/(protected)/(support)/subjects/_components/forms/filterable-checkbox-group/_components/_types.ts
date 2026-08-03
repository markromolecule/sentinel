import type { KeyboardEvent, WheelEvent } from 'react';
import type { FilterableCheckboxOption } from '../_types';

export interface CheckboxItemProps {
    id: string;
    option: FilterableCheckboxOption;
    isSelected: boolean;
    disabled?: boolean;
    onToggle: (value: string) => void;
}

export interface CheckboxListProps {
    title: string;
    options: FilterableCheckboxOption[];
    selectedSet: Set<string>;
    disabled?: boolean;
    onToggle: (value: string) => void;
    emptyMessage: string;
    isCompact?: boolean;
    listClassName?: string;
    minListHeight: number;
    groupId: string;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    onWheelCapture: (event: WheelEvent<HTMLDivElement>) => void;
}
