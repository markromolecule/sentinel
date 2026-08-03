'use client';

import { useId } from 'react';
import { Button, SearchBar } from '@sentinel/ui';
import { SelectionPanelHeader } from '@/app/(protected)/(support)/subjects/_components/forms/selection-panel-header';
import { CheckboxList } from './_components/checkbox-list';
import { DEFAULT_VISIBLE_ROWS } from './_constants';
import { useFilterableCheckboxGroup } from './_hooks/use-filterable-checkbox-group';
import type { FilterableCheckboxGroupProps } from './_types';

export function FilterableCheckboxGroup({
    title,
    searchPlaceholder,
    emptyMessage,
    options,
    selectedValues,
    onToggle,
    helperText,
    selectionSummary,
    visibleRows = DEFAULT_VISIBLE_ROWS,
    disabled = false,
    showSearch = true,
    onSetSelectedValues,
    variant = 'default',
    headerDensity = 'default',
    listClassName,
    searchValue,
    onSearchChange,
    disableLocalFiltering = false,
}: FilterableCheckboxGroupProps) {
    const isCompact = variant === 'compact';
    const groupId = useId();

    const {
        search,
        filteredOptions,
        selectedSet,
        allFilteredSelected,
        minListHeight,
        handleSearchChange,
        handleListKeyDown,
        handleListWheel,
        handleSelectAllToggle,
    } = useFilterableCheckboxGroup({
        options,
        selectedValues,
        searchValue,
        onSearchChange,
        disableLocalFiltering,
        onSetSelectedValues,
        visibleRows,
    });

    return (
        <div className="flex h-full flex-col">
            <SelectionPanelHeader
                title={title}
                selectedCount={selectedValues.length}
                helperText={isCompact ? undefined : helperText}
                selectionSummary={
                    selectionSummary ??
                    (selectedValues.length > 0
                        ? `${selectedValues.length} selected`
                        : 'Nothing selected')
                }
                headerActionSlot={
                    onSetSelectedValues &&
                    options.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllToggle}
                            className="text-muted-foreground hover:text-foreground h-8 px-2 text-[11px] font-semibold tracking-wider uppercase"
                            disabled={disabled}
                        >
                            {allFilteredSelected ? 'Clear All' : 'Select All'}
                        </Button>
                    )
                }
                actionSlot={
                    showSearch && !isCompact ? (
                        <SearchBar
                            value={search}
                            onChange={(event) => handleSearchChange(event.target.value)}
                            placeholder={searchPlaceholder}
                            disabled={disabled}
                            containerClassName="relative z-10"
                            className="bg-muted/40 h-10 border-none py-0 text-[13px] leading-none shadow-none focus-within:ring-1 focus-within:ring-[#323d8f]/30"
                        />
                    ) : undefined
                }
                density={headerDensity}
            />

            <CheckboxList
                title={title}
                options={filteredOptions}
                selectedSet={selectedSet}
                disabled={disabled}
                onToggle={onToggle}
                emptyMessage={emptyMessage}
                isCompact={isCompact}
                listClassName={listClassName}
                minListHeight={minListHeight}
                groupId={groupId}
                onKeyDown={handleListKeyDown}
                onWheelCapture={handleListWheel}
            />
        </div>
    );
}

export * from './_types';
