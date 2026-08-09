'use client';

import * as React from 'react';
import { Button, Label } from '@sentinel/ui';
import {
    useClassroomsQuery,
    useRoomsQuery,
    useUsersQuery,
    useCreateExamSectionAssignmentsBatchMutation,
    useProfileQuery,
    useExamAssignmentBuilder,
} from '@sentinel/hooks';
import { type ClassroomSummary, type Room } from '@sentinel/shared/types';
import { type User } from '@sentinel/services';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { RowInstructorCombobox } from './row-instructor-combobox';
import { RowClassroomCombobox } from './row-classroom-combobox';
import { RowRoomCombobox } from './row-room-combobox';

export interface NewAssignmentsBuilderProps {
    examId: string;
    subjectId?: string;
    currentAssignments: any[];
    onSavingChange?: (saving: boolean) => void;
    onSuccess?: () => void;
    onCancel?: () => void;
}

/**
 * NewAssignmentsBuilder renders a multi-row assignment editor for section, room, and instructor.
 */
export function NewAssignmentsBuilder({
    examId,
    subjectId,
    currentAssignments,
    onSavingChange,
    onSuccess,
    onCancel,
}: NewAssignmentsBuilderProps) {
    const { profile } = useProfileQuery();
    const [submitError, setSubmitError] = React.useState<string | null>(null);

    const { data: classrooms = [], isLoading: isClassroomsLoading } = useClassroomsQuery({
        institutionId: profile?.institutionId || undefined,
        subjectId: subjectId || undefined,
    });
    // Rooms are no longer eagerly loaded — RowRoomCombobox handles lazy search internally
    const { data: rooms = [] } = useRoomsQuery({ limit: 25, page: 1 });
    const { data: users = [], isLoading: isUsersLoading } = useUsersQuery({ role: 'instructor' });

    const filteredClassrooms = React.useMemo(() => {
        const subjectMatchedClassrooms = !subjectId
            ? []
            : (classrooms as ClassroomSummary[]).filter(
                  (classroom) => classroom.subjectId === subjectId,
              );

        if (subjectMatchedClassrooms.length > 0) {
            return subjectMatchedClassrooms;
        }

        return classrooms as ClassroomSummary[];
    }, [classrooms, subjectId]);

    const activeRooms = React.useMemo(() => {
        return (rooms as Room[]).filter((room: Room) => room.status !== 'MAINTENANCE');
    }, [rooms]);

    // Instantiate hook
    const {
        rows,
        bulkInstructorId,
        submitAttempted,
        setSubmitAttempted,
        addRow,
        removeRow,
        updateRowField,
        updateBulkInstructor,
        resetBuilder,
        errors,
        hasErrors,
        readinessCount,
        totalCount,
        hasDuplicatesInRows,
        hasConflictsWithExisting,
        firstInvalidField,
        buildPayload,
    } = useExamAssignmentBuilder({
        currentAssignments,
        classrooms: filteredClassrooms,
    });

    const createMutation = useCreateExamSectionAssignmentsBatchMutation({
        onSuccess: () => {
            toast.success('Classroom assignments saved successfully');
            resetBuilder();
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to save assignments');
        },
    });

    const isPending = createMutation.isPending;

    // Report saving state back to dialog
    React.useEffect(() => {
        onSavingChange?.(isPending);
    }, [isPending, onSavingChange]);

    // Setup element refs for focus management
    const rowRefs = React.useRef<
        Record<
            string,
            {
                classroomId?: HTMLInputElement | null;
                roomId?: HTMLInputElement | null;
                instructorId?: HTMLInputElement | null;
            }
        >
    >({});

    // Focusing the first invalid control reactively after a submit attempt
    React.useEffect(() => {
        if (submitAttempted && firstInvalidField) {
            const target = rowRefs.current[firstInvalidField.localId]?.[firstInvalidField.field];
            target?.focus();
        }
    }, [submitAttempted, firstInvalidField]);

    const handleSubmit = async () => {
        setSubmitAttempted(true);
        const payload = buildPayload();
        if (!payload) {
            return;
        }

        setSubmitError(null);

        try {
            await createMutation.mutateAsync({
                examId,
                payload,
            });
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Failed to save assignments');
        }
    };

    return (
        <div className="flex h-full min-h-[450px] flex-col">
            {/* Top Warnings */}
            {(hasDuplicatesInRows || hasConflictsWithExisting) && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        {hasDuplicatesInRows && 'Duplicate classroom selections detected. '}
                        {hasConflictsWithExisting &&
                            'Some selected classrooms (sections) are already assigned.'}
                    </span>
                </div>
            )}

            {submitError && (
                <div
                    role="alert"
                    className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300"
                >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                </div>
            )}

            {/* Bulk Actions Bar */}
            <div className="mb-4 rounded-lg border bg-zinc-50/50 p-4 dark:bg-zinc-950/20">
                <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <div className="space-y-1 md:max-w-md">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            Apply instructor to all rows
                        </h4>
                        <p className="text-xs text-zinc-500">
                            Fills the instructor field for all current rows and sets the default for
                            any newly added rows.
                        </p>
                    </div>
                    <div className="w-full md:w-80">
                        {isUsersLoading ? (
                            <div className="flex h-10 items-center rounded-md border bg-white px-3 dark:bg-zinc-950">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-500" />
                                <span className="text-xs text-zinc-500">
                                    Loading instructors...
                                </span>
                            </div>
                        ) : (
                            <RowInstructorCombobox
                                value={bulkInstructorId}
                                onValueChange={updateBulkInstructor}
                                users={users as User[]}
                                placeholder="Apply instructor to all..."
                                disabled={isPending}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Assignments Row Editor List */}
            <div className="max-h-[42vh] flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
                <AnimatePresence initial={false}>
                    {rows.map((row, index) => {
                        const rowErrs = errors[row.localId] || {};
                        return (
                            <motion.div
                                key={row.localId}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                transition={{ duration: 0.2 }}
                                className="relative flex flex-col gap-3 rounded-lg border bg-zinc-50/50 p-4 dark:bg-zinc-950/20"
                            >
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                                        Assignment {index + 1}
                                    </span>
                                    {rows.length > 1 && (
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
                                                <span className="text-xs text-zinc-500">
                                                    Loading...
                                                </span>
                                            </div>
                                        ) : (
                                            <RowClassroomCombobox
                                                ref={(el) => {
                                                    if (!rowRefs.current[row.localId])
                                                        rowRefs.current[row.localId] = {};
                                                    rowRefs.current[row.localId].classroomId = el;
                                                }}
                                                value={row.classroomId}
                                                onValueChange={(val) =>
                                                    updateRowField(row.localId, 'classroomId', val)
                                                }
                                                classrooms={filteredClassrooms}
                                                disabled={isPending}
                                                placeholder="Select classroom"
                                                aria-invalid={
                                                    submitAttempted && !!rowErrs.classroomId
                                                }
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

                                    {/* Room Combobox */}
                                    <div className="space-y-1.5 md:col-span-4">
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                            Room
                                        </Label>
                                        <RowRoomCombobox
                                            ref={(el) => {
                                                if (!rowRefs.current[row.localId])
                                                    rowRefs.current[row.localId] = {};
                                                rowRefs.current[row.localId].roomId = el;
                                            }}
                                            value={row.roomId}
                                            onValueChange={(val) =>
                                                updateRowField(row.localId, 'roomId', val)
                                            }
                                            rooms={activeRooms}
                                            disabled={isPending}
                                            placeholder="Search room..."
                                            aria-invalid={submitAttempted && !!rowErrs.roomId}
                                            aria-describedby={
                                                submitAttempted && rowErrs.roomId
                                                    ? `err-room-${row.localId}`
                                                    : undefined
                                            }
                                        />
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
                                                <span className="text-xs text-zinc-500">
                                                    Loading...
                                                </span>
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
                                                users={users as User[]}
                                                disabled={isPending}
                                                placeholder="Select instructor"
                                                aria-invalid={
                                                    submitAttempted && !!rowErrs.instructorId
                                                }
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
                    })}
                </AnimatePresence>
            </div>

            {/* Bottom Actions Footer (Sticky/Fixed style inside dialog) */}
            <div className="-mx-6 mt-auto -mb-6 flex flex-col justify-between gap-3 rounded-b-xl border-t bg-zinc-50 p-4 sm:flex-row sm:items-center dark:bg-zinc-950/20">
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRow}
                        disabled={isPending}
                        className="w-full sm:w-auto"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add another classroom
                    </Button>
                    <span className="hidden text-xs font-semibold text-zinc-500 sm:inline">
                        {readinessCount} of {totalCount} assignments ready
                    </span>
                </div>

                <div className="flex w-full gap-2 sm:w-auto">
                    <span className="mr-auto inline-flex items-center self-center text-xs font-semibold text-zinc-500 sm:hidden">
                        {readinessCount}/{totalCount} ready
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isPending}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="w-full bg-[#323d8f] font-semibold text-white hover:bg-[#323d8f]/90 sm:w-auto"
                    >
                        {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                        Save assignments
                    </Button>
                </div>
            </div>
        </div>
    );
}
