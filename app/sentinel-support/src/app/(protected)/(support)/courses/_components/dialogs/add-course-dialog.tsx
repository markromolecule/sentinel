'use client';

import { useDepartmentsQuery, useActivePermissions, useInstitutionsQuery } from '@sentinel/hooks';
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@sentinel/ui';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@sentinel/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@sentinel/ui';
import { Input } from '@sentinel/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sentinel/ui';
import { useAddCourseForm } from '../../_hooks/use-add-course-form';

interface AddCourseDialogProps {
    institutionId: string;
}

const UNASSIGNED_DEPARTMENT_VALUE = '__unassigned__';

export function AddCourseDialog({ institutionId }: AddCourseDialogProps) {
    const { hasPermission } = useActivePermissions();
    const [open, setOpen] = useState(false);
    const [selectedInstitutionId, setSelectedInstitutionId] = useState(institutionId);
    const effectiveInstitutionId = selectedInstitutionId || institutionId;

    const { data: institutions = [] } = useInstitutionsQuery();
    const { data: departments = [], isLoading: isLoadingDepartments } = useDepartmentsQuery({
        search: '',
        institutionId: effectiveInstitutionId || undefined,
    });
    const { form, onSubmit, isPending } = useAddCourseForm(effectiveInstitutionId, () =>
        setOpen(false),
    );
    const scopedDepartments = useMemo(
        () =>
            departments.filter(
                (department) =>
                    !effectiveInstitutionId || department.institutionId === effectiveInstitutionId,
            ),
        [departments, effectiveInstitutionId],
    );

    const handleInstitutionChange = (nextInstitutionId: string) => {
        setSelectedInstitutionId(nextInstitutionId);
        form.setValue('department_id', null);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setSelectedInstitutionId(institutionId);
            form.setValue('department_id', null);
        }
        setOpen(nextOpen);
    };

    if (!hasPermission('courses:create')) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Course
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Course</DialogTitle>
                    <DialogDescription>
                        Create a new academic program or course for the selected institution.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <FormLabel>Institution</FormLabel>
                            <Select
                                value={effectiveInstitutionId || undefined}
                                onValueChange={handleInstitutionChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select institution" />
                                </SelectTrigger>
                                <SelectContent>
                                    {institutions.map((institution) => (
                                        <SelectItem key={institution.id} value={institution.id}>
                                            {institution.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Course Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., BSIT-MWA" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descriptive Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., Bachelor of Science in Information Technology..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="department_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department</FormLabel>
                                    <Select
                                        onValueChange={(value) =>
                                            field.onChange(
                                                value === UNASSIGNED_DEPARTMENT_VALUE
                                                    ? null
                                                    : value,
                                            )
                                        }
                                        value={field.value ?? UNASSIGNED_DEPARTMENT_VALUE}
                                    >
                                        <FormControl>
                                            <SelectTrigger disabled={!effectiveInstitutionId}>
                                                <SelectValue placeholder="Select Department" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={UNASSIGNED_DEPARTMENT_VALUE}>
                                                Unassigned
                                            </SelectItem>
                                            {isLoadingDepartments ? (
                                                <SelectItem value="loading" disabled>
                                                    Loading departments...
                                                </SelectItem>
                                            ) : (
                                                scopedDepartments.map((department) => (
                                                    <SelectItem
                                                        key={department.id}
                                                        value={department.id}
                                                    >
                                                        {department.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending || !effectiveInstitutionId}>
                                {isPending ? 'Creating...' : 'Create Course'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
