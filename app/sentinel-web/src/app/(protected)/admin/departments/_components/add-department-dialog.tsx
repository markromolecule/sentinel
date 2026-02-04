
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useDepartmentMutations } from "../_hooks/use-departments";
import { DepartmentInput } from "../_types";
import { Department } from "@sentinel/shared/src/types";
import { Loader2 } from "lucide-react";

interface AddDepartmentDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    departmentToEdit?: Department | null;
}

export function AddDepartmentDialog({ open, onOpenChange, departmentToEdit }: AddDepartmentDialogProps) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const { createDepartment, updateDepartment } = useDepartmentMutations();

    const isEditing = !!departmentToEdit;
    const isLoading = createDepartment.isPending || updateDepartment.isPending;

    useEffect(() => {
        if (departmentToEdit) {
            setName(departmentToEdit.name);
            setCode(departmentToEdit.code || "");
        } else {
            setName("");
            setCode("");
        }
    }, [departmentToEdit, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (isEditing && departmentToEdit) {
                await updateDepartment.mutateAsync({
                    id: departmentToEdit.id,
                    data: { name, code }
                });
            } else {
                await createDepartment.mutateAsync({ name, code });
            }
            
            // Close dialog
            handleOpenChange(false);
            
            // Reset form if creating
            if (!isEditing) {
                setName("");
                setCode("");
            }
        } catch (error) {
            // Error handled by hook toast
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        setIsOpen(newOpen);
        if (onOpenChange) {
            onOpenChange(newOpen);
        }
        if (!newOpen && !isEditing) {
             setName("");
             setCode("");
        }
    };

    // Derived state for controlled vs uncontrolled usage
    const show = open !== undefined ? open : isOpen;

    return (
        <Dialog open={show} onOpenChange={handleOpenChange}>
             {!onOpenChange && (
                <DialogTrigger asChild>
                    <Button>Add Department</Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Department" : "Add Department"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update department details." : "Create a new department for the institution."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="School of..."
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">
                                Code
                            </Label>
                            <Input
                                id="code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. SASE"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "Save Changes" : "Create Department"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
