import * as z from "zod";

export const userFormSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["admin", "proctor", "instructor", "student"]),
    department: z.string().optional(),
    studentNo: z.string().optional(),
}).refine((data) => {
    if (data.role === "student" && !data.studentNo) {
        return false;
    }
    return true;
}, {
    message: "Student ID is required for students",
    path: ["studentNo"],
});

export type UserFormValues = z.infer<typeof userFormSchema>;
