import * as z from "zod";

export const assignmentFormSchema = z.object({
    proctorId: z.string().min(1, "Proctor is required"),
    examId: z.string().min(1, "Exam is required"),
    notes: z.string().optional(),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
