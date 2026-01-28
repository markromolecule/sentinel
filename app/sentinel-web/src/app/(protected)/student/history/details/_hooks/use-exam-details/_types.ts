import { ExamHistory } from "@/app/(protected)/student/_types";

export interface UseExamDetailsReturn {
    examId: string | null;
    historyItem: ExamHistory | undefined;
    isLoading: boolean;
}
