'use client';

import * as React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@sentinel/ui';
import { useDeleteExamSectionAssignmentMutation } from '@sentinel/hooks';
import { toast } from 'sonner';

export interface DeleteAssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assignmentId: string;
    examId: string;
    classroomName: string;
}

/**
 * Confirms removal of a classroom assignment and runs the deletion mutation.
 */
export function DeleteAssignmentDialog({
    open,
    onOpenChange,
    assignmentId,
    examId,
    classroomName,
}: DeleteAssignmentDialogProps) {
    const mutation = useDeleteExamSectionAssignmentMutation({
        onSuccess: () => {
            toast.success('Assignment removed successfully');
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to remove assignment');
        },
    });

    const handleConfirm = React.useCallback(() => {
        void mutation.mutateAsync({
            examId,
            id: assignmentId,
        });
    }, [assignmentId, examId, mutation]);

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove the exam assignment for &quot;{classroomName}&quot;. The
                        classroom will no longer be linked to this exam.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(event) => {
                            event.preventDefault();
                            handleConfirm();
                        }}
                        disabled={mutation.isPending}
                        className="bg-destructive hover:bg-destructive/90 text-white"
                    >
                        {mutation.isPending ? 'Removing...' : 'Remove'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
