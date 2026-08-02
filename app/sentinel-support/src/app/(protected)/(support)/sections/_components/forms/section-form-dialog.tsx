'use client';

import { UseFormReturn } from 'react-hook-form';
import { SectionFormValues } from '@sentinel/shared/schema';
import {
    Course,
    Department,
    Institution,
    InstitutionNamingConventions,
} from '@sentinel/shared/types';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Form,
} from '@sentinel/ui';
import { SectionFormFields } from '../section-form-fields';

export type SectionFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingSectionId: string | null;
    form: UseFormReturn<SectionFormValues>;
    institutions: Institution[];
    departments: Department[];
    courses: Course[];
    namingConvention: InstitutionNamingConventions | null | undefined;
    isPending: boolean;
    onSubmit: (values: SectionFormValues) => void;
};

export function SectionFormDialog({
    open,
    onOpenChange,
    editingSectionId,
    form,
    institutions,
    departments,
    courses,
    namingConvention,
    isPending,
    onSubmit,
}: SectionFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingSectionId ? 'Edit Section' : 'Add Section'}</DialogTitle>
                    <DialogDescription>
                        Section changes are scoped to the selected template context.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <SectionFormFields
                            form={form}
                            institutions={institutions}
                            departments={departments}
                            courses={courses}
                            namingConvention={namingConvention}
                            isPending={isPending}
                            mode={editingSectionId ? 'edit' : 'create'}
                        />
                        <DialogFooter>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
