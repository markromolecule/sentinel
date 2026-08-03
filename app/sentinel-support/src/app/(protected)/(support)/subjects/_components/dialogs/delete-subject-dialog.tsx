'use client';

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
import { MasterSubject } from '@sentinel/shared/types';

export type DeleteSubjectDialogProps = {
    open: boolean;
    subject: MasterSubject | null;
    isDeleting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DeleteSubjectDialog({
    open,
    subject,
    isDeleting,
    onOpenChange,
    onConfirm,
}: DeleteSubjectDialogProps) {
    const subjectTitle = subject?.title.trim() || 'this subject';
    const subjectCode = subject?.code.trim();

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this subject?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently remove{' '}
                        <span className="text-foreground font-medium">
                            {subjectTitle}
                            {subjectCode ? ` (${subjectCode})` : ''}
                        </span>{' '}
                        from the subject catalog. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        disabled={isDeleting || !subject}
                        onClick={(event) => {
                            event.preventDefault();
                            onConfirm();
                        }}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Subject'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
