import { useSearchParams } from "next/navigation";
import { MOCK_EXAM_HISTORY } from "@/app/(protected)/student/_constants";
import { UseExamDetailsReturn } from "@/app/(protected)/student/history/details/_hooks/use-exam-details/_types";

export function useExamDetails(): UseExamDetailsReturn {
    const searchParams = useSearchParams();
    const examId = searchParams.get("id");
    const historyItem = MOCK_EXAM_HISTORY.find((item) => item.examId === examId);

    return {
        examId,
        historyItem,
        isLoading: false // Since it's mock data, it's always loaded. Real api would have loading state.
    };
}
