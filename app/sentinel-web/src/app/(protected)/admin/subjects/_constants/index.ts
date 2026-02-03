import { SubjectStoreState } from "@/app/(protected)/admin/subjects/_types";

// Default state constant
export const DEFAULT_SUBJECT_STORE_STATE: SubjectStoreState = {
    subjects: [
        {
            id: "1",
            title: "Data Structures",
            code: "CS201",
            section: "A",
            createdAt: new Date().toISOString(),
            createdBy: "Maria Santos",
        },
        {
            id: "2",
            title: "Programming Fundamentals",
            code: "CS101",
            section: "B",
            createdAt: new Date().toISOString(),
            createdBy: "Juan Dela Cruz",
        },
        {
            id: "3",
            title: "Web Development",
            code: "IT305",
            section: "A",
            createdAt: new Date().toISOString(),
            createdBy: "Maria Santos",
        },
    ],
};