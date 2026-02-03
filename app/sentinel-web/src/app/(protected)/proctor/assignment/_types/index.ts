import { ProctorExam } from "@/app/(protected)/proctor/_types";

export interface ProctorAssignmentExam extends ProctorExam {
    assignedProctor: string;
    assignedProctorId: string;
}
