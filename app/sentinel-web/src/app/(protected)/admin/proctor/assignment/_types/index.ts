import { ProctorAssignment } from "@/app/(protected)/admin/_types";

export type { ProctorAssignment };

export interface AssignProctorFormData {
    proctorId: string;
    examId: string;
    // For simplicity, we might just assume assigning to an exam assigns to all students or select students later
    // The previous table didn't show specific student assignment in the row, just a count.

    // We will stick to assigning a proctor to an exam for now.
}

export interface AssignProctorDialogProps {
    assignment?: ProctorAssignment | null; // If null, creating new
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
