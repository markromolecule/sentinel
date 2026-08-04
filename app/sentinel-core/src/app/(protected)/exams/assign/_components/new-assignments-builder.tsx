'use client';

import * as React from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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

import { AssignmentBuilderBulkBar } from './assignment-builder-bulk-bar';
import { AssignmentBuilderRow } from './assignment-builder-row';
import { AssignmentBuilderFooter } from './assignment-builder-footer';

interface NewAssignmentsBuilderProps {
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
function NewAssignmentsBuilder({
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
    const { data: rooms = [], isLoading: isRoomsLoading } = useRoomsQuery();
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
                roomId?: HTMLButtonElement | null;
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
            <AssignmentBuilderBulkBar
                bulkInstructorId={bulkInstructorId}
                users={users as User[]}
                isUsersLoading={isUsersLoading}
                isPending={isPending}
                updateBulkInstructor={updateBulkInstructor}
            />

            {/* Assignments Row Editor List */}
            <div className="max-h-[42vh] flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
                <AnimatePresence initial={false}>
                    {rows.map((row, index) => (
                        <AssignmentBuilderRow
                            key={row.localId}
                            row={row}
                            index={index}
                            errors={errors[row.localId] || {}}
                            submitAttempted={submitAttempted}
                            classrooms={filteredClassrooms}
                            rooms={activeRooms}
                            users={users as User[]}
                            isClassroomsLoading={isClassroomsLoading}
                            isRoomsLoading={isRoomsLoading}
                            isUsersLoading={isUsersLoading}
                            isPending={isPending}
                            removeRow={removeRow}
                            updateRowField={updateRowField}
                            rowRefs={rowRefs}
                            showRemoveButton={rows.length > 1}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Bottom Actions Footer */}
            <AssignmentBuilderFooter
                readinessCount={readinessCount}
                totalCount={totalCount}
                isPending={isPending}
                onAddRow={addRow}
                onCancel={onCancel}
                onSubmit={handleSubmit}
            />
        </div>
    );
}

export { NewAssignmentsBuilder };
export type { NewAssignmentsBuilderProps };
