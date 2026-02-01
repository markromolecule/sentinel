import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface Subject {
    id: string;
    title: string;
    code: string;
    section: string;
    createdAt: Date;
}

// Define the state type
export type SubjectStoreState = {
    subjects: Subject[];
};

// Define the action payload type
export type AddSubjectPayload = {
    title: string;
    code: string;
    section: string;
};

// Define the actions type
export type SubjectStoreActions = {
    addSubject: (payload: AddSubjectPayload) => void;
    removeSubject: (id: string) => void;
    setSubjects: (subjects: Subject[]) => void;
};

// Default state constant
export const DEFAULT_SUBJECT_STORE_STATE: SubjectStoreState = {
    subjects: [
        {
            id: "1",
            title: "Data Structures",
            code: "CS201",
            section: "A",
            createdAt: new Date(),
        },
        {
            id: "2",
            title: "Programming Fundamentals",
            code: "CS101",
            section: "B",
            createdAt: new Date(),
        },
        {
            id: "3",
            title: "Web Development",
            code: "IT305",
            section: "A",
            createdAt: new Date(),
        },
    ],
};

// Combined store type
export type SubjectStore = SubjectStoreState & SubjectStoreActions;

// Create and export the store hook
export const useSubjectStore = create(
    immer<SubjectStore>((set) => ({
        ...DEFAULT_SUBJECT_STORE_STATE,

        /* Actions */
        addSubject: (payload) => {
            set((state) => {
                const newSubject: Subject = {
                    id: crypto.randomUUID(),
                    ...payload,
                    createdAt: new Date(),
                };
                state.subjects.push(newSubject);
            });
        },
        removeSubject: (id) => {
            set((state) => {
                state.subjects = state.subjects.filter((s) => s.id !== id);
            });
        },
        setSubjects: (subjects) => {
            set((state) => {
                state.subjects = subjects;
            });
        },
    }))
);
