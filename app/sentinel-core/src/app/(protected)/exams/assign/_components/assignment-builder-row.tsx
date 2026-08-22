'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';

import {
    Button,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    cn,
} from '@sentinel/ui';
import { type AssignmentRow, type AssignmentRowErrors } from '@sentinel/hooks';
import { type ClassroomSummary, type Room } from '@sentinel/shared/types';
import { type User } from '@sentinel/services';

import { RowClassroomCombobox } from './row-classroom-combobox';
import { RowInstructorCombobox } from './row-instructor-combobox';

interface AssignmentBuilderRowProps {
    row: AssignmentRow;
    index: number;
    errors: AssignmentRowErrors;
    submitAttempted: boolean;
    classrooms: ClassroomSummary[];
    rooms: Room[];
    users: User[];
    isClassroomsLoading: boolean;
    isRoomsLoading: boolean;
    isUsersLoading: boolean;
    isPending: boolean;
    removeRow: (localId: string) => void;
    updateRowField: (localId: string, field: keyof AssignmentRow, value: string) => void;
    rowRefs: React.MutableRefObject<
        Record<
            string,
            {
                classroomId?: HTMLInputElement | null;
                roomId?: HTMLButtonElement | null;
                instructorId?: HTMLInputElement | null;
            }
        >
    >;
    showRemoveButton: boolean;
}

function AssignmentBuilderRow({
    row,
    index,
    errors,
    submitAttempted,
    classrooms,
    rooms,
    users,
    isClassroomsLoading,
    isRoomsLoading,
    isUsersLoading,
    isPending,
    removeRow,
    updateRowField,
    rowRefs,
    showRemoveButton,
}: AssignmentBuilderRowProps) {
    const rowErrs = errors || {};

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative flex flex-col gap-3 rounded-lg border bg-zinc-50/50 p-4 dark:bg-zinc-950/20"
        >
            <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Assignment {index + 1}
                </span>
                {showRemoveButton && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        onClick={() => removeRow(row.localId)}
                        disabled={isPending}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12">
                {/* Classroom Select */}
                <div className="space-y-1.5 md:col-span-4">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Classroom
                    </Label>
                    {isClassroomsLoading ? (
                        <div className="flex h-10 items-center rounded-md border bg-white px-3 dark:bg-zinc-950">
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin text-zinc-500" />
                            <span className="text-xs text-zinc-500">Loading...</span>
                        </div>
                    ) : (
                        <RowClassroomCombobox
                            ref={(el) => {
                                if (!rowRefs.current[row.localId])
                                    rowRefs.current[row.localId] = {};
                                rowRefs.current[row.localId].classroomId = el;
                            }}
                            value={row.classroomId}
                            onValueChange={(val) => updateRowField(row.localId, 'classroomId', val)}
                            classrooms={classrooms}
                            disabled={isPending}
                            placeholder="Select classroom"
                            aria-invalid={submitAttempted && !!rowErrs.classroomId}
                            aria-describedby={
                                submitAttempted && rowErrs.classroomId
                                    ? `err-classroom-${row.localId}`
                                    : undefined
                            }
                        />
                    )}
                    {submitAttempted && rowErrs.classroomId && (
                        <p
                            id={`err-classroom-${row.localId}`}
                            className="mt-1 text-[11px] font-medium text-red-500"
                        >
                            {rowErrs.classroomId}
                        </p>
                    )}
                </div>

                {/* Room Select */}
                <div className="space-y-1.5 md:col-span-4">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Room
                    </Label>
                    {isRoomsLoading ? (
                        <div className="flex h-10 items-center rounded-md border bg-white px-3 dark:bg-zinc-950">
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin text-zinc-500" />
                            <span className="text-xs text-zinc-500">Loading...</span>
                        </div>
                    ) : (
                        <Select
                            value={row.roomId}
                            onValueChange={(val) => updateRowField(row.localId, 'roomId', val)}
                            disabled={isPending}
                        >
                            <SelectTrigger
                                ref={(el) => {
                                    if (!rowRefs.current[row.localId])
                                        rowRefs.current[row.localId] = {};
                                    rowRefs.current[row.localId].roomId = el;
                                }}
                                aria-invalid={submitAttempted && !!rowErrs.roomId}
                                aria-describedby={
                                    submitAttempted && rowErrs.roomId
                                        ? `err-room-${row.localId}`
                                        : undefined
                                }
                                className="bg-white dark:bg-zinc-950"
                            >
                                <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                            <SelectContent>
                                {(Array.isArray(rooms) ? rooms : []).map((room) => (
                                    <SelectItem key={room.id} value={room.id}>
                                        <div className="flex w-full items-center justify-between gap-2">
                                            <span>
                                                {room.name} ({room.room_number})
                                            </span>
                                            <span
                                                className={cn(
                                                    'ml-2 rounded-xs border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
                                                    room.status === 'AVAILABLE'
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400',
                                                )}
                                            >
                                                {room.status === 'AVAILABLE'
                                                    ? 'Available'
                                                    : 'Assigned'}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {submitAttempted && rowErrs.roomId && (
                        <p
                            id={`err-room-${row.localId}`}
                            className="mt-1 text-[11px] font-medium text-red-500"
                        >
                            {rowErrs.roomId}
                        </p>
                    )}
                </div>

                {/* Instructor Select */}
                <div className="space-y-1.5 md:col-span-4">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Instructor
                    </Label>
                    {isUsersLoading ? (
                        <div className="flex h-10 items-center rounded-md border bg-white px-3 dark:bg-zinc-950">
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin text-zinc-500" />
                            <span className="text-xs text-zinc-500">Loading...</span>
                        </div>
                    ) : (
                        <RowInstructorCombobox
                            ref={(el) => {
                                if (!rowRefs.current[row.localId])
                                    rowRefs.current[row.localId] = {};
                                rowRefs.current[row.localId].instructorId = el;
                            }}
                            value={row.instructorId}
                            onValueChange={(val) =>
                                updateRowField(row.localId, 'instructorId', val)
                            }
                            users={users}
                            disabled={isPending}
                            placeholder="Select instructor"
                            aria-invalid={submitAttempted && !!rowErrs.instructorId}
                            aria-describedby={
                                submitAttempted && rowErrs.instructorId
                                    ? `err-instructor-${row.localId}`
                                    : undefined
                            }
                        />
                    )}
                    {submitAttempted && rowErrs.instructorId && (
                        <p
                            id={`err-instructor-${row.localId}`}
                            className="mt-1 text-[11px] font-medium text-red-500"
                        >
                            {rowErrs.instructorId}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export { AssignmentBuilderRow };
export type { AssignmentBuilderRowProps };
