import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@sentinel/ui';
import type { Institution } from '@sentinel/shared/types';
import { SubjectFormState } from '../../_hooks/use-subjects-page-state/_types';

export type SubjectFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: SubjectFormState;
    setForm: (form: SubjectFormState) => void;
    onSubmit: () => void;
    isPending: boolean;
    institutions: Institution[];
};

export function SubjectFormDialog({
    open,
    onOpenChange,
    form,
    setForm,
    onSubmit,
    isPending,
    institutions,
}: SubjectFormDialogProps) {
    const isCreateMode = !form.id;
    const canSubmit = !isPending && form.code.trim().length > 0 && form.title.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isCreateMode ? 'Add Subject' : 'Edit Subject'}</DialogTitle>
                    <DialogDescription>
                        {isCreateMode
                            ? 'Create a subject and assign it to an institution.'
                            : 'Subject changes are scoped to the selected template context.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    {isCreateMode ? (
                        <div className="space-y-2">
                            <Label>Institution</Label>
                            <Select
                                value={form.institutionId || undefined}
                                onValueChange={(institutionId) =>
                                    setForm({ ...form, institutionId })
                                }
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
                    ) : null}
                    <div className="space-y-2">
                        <Label>Code</Label>
                        <Input
                            value={form.code}
                            onChange={(event) => setForm({ ...form, code: event.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={!canSubmit || (isCreateMode && !form.institutionId)}
                    >
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
