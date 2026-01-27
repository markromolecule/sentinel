import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { ExamNotFoundProps } from "@/app/(protected)/student/_types";

export function ExamNotFound({ onBack }: ExamNotFoundProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Exam Not Found</h1>
            <p className="text-white/60">The exam you are looking for does not exist or has been removed.</p>
            <Button variant="outline" className="mt-4" onClick={onBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Exams
            </Button>
        </div>
    );
}
