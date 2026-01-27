import { ExamHistory } from "../../../../_types";

export interface UseExamDetailsReturn {
    examId: string | null;
    historyItem: ExamHistory | undefined;
    isLoading: boolean;
}
