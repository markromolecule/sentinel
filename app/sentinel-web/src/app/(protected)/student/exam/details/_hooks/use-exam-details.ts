import { useSearchParams, useRouter } from "next/navigation";
import { MOCK_EXAMS } from "../../../_constants";

export function useExamDetails() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const examId = searchParams.get("id");
    const exam = MOCK_EXAMS.find((e) => e.id === examId);

    const handleBack = () => {
        router.back();
    };

    return {
        exam,
        examId,
        handleBack,
    };
}
