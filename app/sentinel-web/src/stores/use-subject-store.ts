import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { type Subject } from "@sentinel/shared/src/types";
import { DEFAULT_SUBJECT_STORE_STATE } from "@/app/(protected)/admin/subjects/_constants";
import { SubjectStoreState } from "@/app/(protected)/admin/subjects/_types";

// Define the action payload type
export type AddSubjectPayload = {
    title: string;
    code: string;
    section: string;
    department: string;
    createdBy?: string; // Optional for now, defaults to "Current User" if not provided
};

// Define the actions type
export type SubjectStoreActions = {
    addSubject: (payload: AddSubjectPayload) => void;
    removeSubject: (id: string) => void;
    setSubjects: (subjects: Subject[]) => void;
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
                    department: payload.department,
                    createdBy: payload.createdBy || "Current User",
                    createdAt: new Date().toISOString(),
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
