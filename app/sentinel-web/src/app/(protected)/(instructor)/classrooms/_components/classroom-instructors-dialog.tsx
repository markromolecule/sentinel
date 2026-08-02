import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@sentinel/hooks';
import {
    assignClassroomInstructor,
    getClassroomInstructors,
    removeClassroomInstructor,
} from '@sentinel/services';
import { type ClassroomDetail } from '@sentinel/shared/types';
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    ScrollArea,
} from '@sentinel/ui';
import { UserPlus, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { AssignClassroomInstructorDialog } from './assign-classroom-instructor-dialog';

type ClassroomInstructorsDialogProps = {
    classroom: ClassroomDetail;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function ClassroomInstructorsDialog({
    classroom,
    open,
    onOpenChange,
}: ClassroomInstructorsDialogProps) {
    const apiClient = useApi();
    const queryClient = useQueryClient();
    const [isAssignOpen, setIsAssignOpen] = useState(false);

    const instructorsQuery = useQuery({
        queryKey: ['classrooms', classroom.id, 'instructors'],
        queryFn: () => getClassroomInstructors(apiClient, classroom.id),
        enabled: open,
    });

    const assignMutation = useMutation({
        mutationFn: (instructorUserId: string) =>
            assignClassroomInstructor(apiClient, {
                classroomId: classroom.id,
                instructorUserId,
            }),
        onSuccess: () => {
            toast.success('Instructor assigned successfully.');
            void queryClient.invalidateQueries({
                queryKey: ['classrooms', classroom.id, 'instructors'],
            });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign instructor.');
        },
    });

    const removeMutation = useMutation({
        mutationFn: (instructorUserId: string) =>
            removeClassroomInstructor(apiClient, {
                classroomId: classroom.id,
                instructorUserId,
            }),
        onSuccess: () => {
            toast.success('Instructor removed successfully.');
            void queryClient.invalidateQueries({
                queryKey: ['classrooms', classroom.id, 'instructors'],
            });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to remove instructor.');
        },
    });

    const instructors = instructorsQuery.data ?? [];
    const canManageInstructors = classroom.canManage;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Classroom Instructors</DialogTitle>
                        <DialogDescription>
                            Manage classroom teaching access and head-instructor ownership.
                        </DialogDescription>
                    </DialogHeader>

                    {canManageInstructors ? (
                        <div className="mb-4 flex justify-end">
                            <Button
                                onClick={() => setIsAssignOpen(true)}
                                disabled={instructorsQuery.isLoading}
                                size="sm"
                                className="bg-[#323d8f] text-white hover:bg-[#323d8f]/90"
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Assign Instructor
                            </Button>
                        </div>
                    ) : null}

                    <ScrollArea className="max-h-[60vh] pr-4">
                        {instructorsQuery.error ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {instructorsQuery.error.message ||
                                    'Unable to load classroom instructors.'}
                            </div>
                        ) : instructorsQuery.isLoading ? (
                            <div className="text-muted-foreground p-4 text-center text-sm">
                                Loading instructors...
                            </div>
                        ) : instructors.length === 0 ? (
                            <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                                No instructors are assigned to this classroom yet.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {instructors.map((instructor) => (
                                    <div
                                        key={instructor.userId}
                                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-medium">
                                                    {instructor.name}
                                                </span>
                                                {instructor.isHead ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className="h-5 px-1.5 text-[10px]"
                                                    >
                                                        Head Instructor
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="h-5 px-1.5 text-[10px]"
                                                    >
                                                        Assigned
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-muted-foreground text-[11px]">
                                                {instructor.assignedAt
                                                    ? `Assigned ${new Date(instructor.assignedAt).toLocaleDateString()}`
                                                    : 'Assignment date unavailable'}
                                                {instructor.assignedByName
                                                    ? ` by ${instructor.assignedByName}`
                                                    : ''}
                                            </div>
                                        </div>

                                        {canManageInstructors && !instructor.isHead ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={() =>
                                                    removeMutation.mutate(instructor.userId)
                                                }
                                                disabled={removeMutation.isPending}
                                            >
                                                <UserX className="mr-1.5 h-3.5 w-3.5" />
                                                Remove
                                            </Button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <AssignClassroomInstructorDialog
                open={isAssignOpen}
                onOpenChangeAction={setIsAssignOpen}
                institutionId={classroom.institutionId}
                assignedInstructors={instructors}
                onAssignAction={async (instructorUserId) => {
                    await assignMutation.mutateAsync(instructorUserId);
                }}
                isSubmitting={assignMutation.isPending}
            />
        </>
    );
}
