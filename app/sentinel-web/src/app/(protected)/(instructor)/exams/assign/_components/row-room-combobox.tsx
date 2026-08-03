'use client';

import * as React from 'react';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
    cn,
} from '@sentinel/ui';
import { type Room } from '@sentinel/shared/types';
import { useRoomSearch } from '@sentinel/hooks';

export interface RowRoomComboboxProps extends React.ComponentPropsWithoutRef<'input'> {
    value: string;
    onValueChange: (value: string) => void;
    rooms: Room[];
    disabled?: boolean;
}

/**
 * RowRoomCombobox provides a searchable room selection field with status badges.
 * Uses debounced server-side search (>= 2 chars) and falls back to client-side
 * filtering of the initial rooms list for short queries.
 */
export const RowRoomCombobox = React.forwardRef<HTMLInputElement, RowRoomComboboxProps>(
    (
        {
            value,
            onValueChange,
            rooms,
            disabled = false,
            placeholder = 'Select room',
            'aria-invalid': ariaInvalid,
            'aria-describedby': ariaDescribedby,
            ...props
        },
        ref,
    ) => {
        const [searchTerm, setSearchTerm] = React.useState('');
        const [open, setOpen] = React.useState(false);

        // Server-side debounced search (fires when searchTerm >= 2 chars)
        const { rooms: searchedRooms, isLoading: isSearchLoading } = useRoomSearch(searchTerm);

        // Persist the last successfully resolved room so it survives search term resets
        const [cachedRoom, setCachedRoom] = React.useState<Room | null>(null);

        // Find the currently selected room for display
        const selectedRoom = React.useMemo(() => {
            if (!value || value === 'none') return null;
            return (
                rooms.find((r) => r.id === value) ||
                searchedRooms.find((r) => r.id === value) ||
                cachedRoom
            );
        }, [rooms, searchedRooms, value, cachedRoom]);

        // Whenever we successfully resolve the selected room, cache it so it
        // persists after the search term is cleared on dropdown close.
        React.useEffect(() => {
            if (!value || value === 'none') {
                setCachedRoom(null);
                return;
            }
            const found =
                rooms.find((r) => r.id === value) ||
                searchedRooms.find((r) => r.id === value) ||
                null;
            if (found) {
                setCachedRoom(found);
            }
        }, [value, rooms, searchedRooms]);

        const selectedName = React.useMemo(() => {
            if (!selectedRoom) return '';
            return `${selectedRoom.name} (${selectedRoom.room_number})`;
        }, [selectedRoom]);

        const [displayValue, setDisplayValue] = React.useState('');

        // Synchronize display value with selection when dropdown opens/closes
        React.useEffect(() => {
            if (!open) {
                setDisplayValue(selectedName);
                setSearchTerm('');
            }
        }, [open, selectedName]);

        // Use server-side results when >= 2 chars, else client-side filter of initial list
        const filteredRooms = React.useMemo(() => {
            const term = searchTerm.toLowerCase().trim();
            if (term.length >= 2) {
                return searchedRooms;
            }
            if (!term) return rooms;
            return rooms.filter((room) => {
                const name = (room.name || '').toLowerCase();
                const number = (room.room_number || '').toLowerCase();
                return name.includes(term) || number.includes(term);
            });
        }, [rooms, searchedRooms, searchTerm]);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setDisplayValue(val);
            setSearchTerm(val);

            // If user clears the input, clear the selection
            if (!val) {
                onValueChange('none');
            }
        };

        return (
            <Combobox
                value={value === 'none' ? null : value}
                onValueChange={(val) => {
                    onValueChange(val || 'none');
                    setOpen(false);
                }}
                open={disabled ? false : open}
                onOpenChange={setOpen}
                filter={null}
            >
                <ComboboxInput
                    ref={ref}
                    placeholder={placeholder}
                    disabled={disabled}
                    value={open ? displayValue : selectedName || ''}
                    onChange={handleInputChange}
                    showClear={value !== 'none'}
                    aria-invalid={ariaInvalid}
                    aria-describedby={ariaDescribedby}
                    className="w-full bg-white dark:bg-zinc-950"
                    onFocus={() => {
                        setOpen(true);
                        setDisplayValue(searchTerm);
                    }}
                    {...props}
                />
                <ComboboxContent className="w-full min-w-[240px] rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950">
                    <ComboboxList className="max-h-60 overflow-y-auto p-1">
                        {filteredRooms.map((room) => (
                            <ComboboxItem key={room.id} value={room.id}>
                                <div className="flex w-full items-center justify-between gap-2">
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {room.name}
                                        </span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Room {room.room_number}
                                        </span>
                                    </div>
                                    <span
                                        className={cn(
                                            'ml-2 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
                                            room.status === 'AVAILABLE'
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400',
                                        )}
                                    >
                                        {room.status === 'AVAILABLE' ? 'Available' : 'Assigned'}
                                    </span>
                                </div>
                            </ComboboxItem>
                        ))}
                        {filteredRooms.length === 0 && (
                            <ComboboxEmpty className="py-2 text-center text-xs text-zinc-500">
                                {isSearchLoading ? 'Searching rooms...' : 'No rooms found'}
                            </ComboboxEmpty>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        );
    },
);

RowRoomCombobox.displayName = 'RowRoomCombobox';
