import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, HelpCircle, Trophy } from "lucide-react";
import { ExamSidebarProps } from "@/app/(protected)/student/_types";

export function ExamSidebar({ exam }: ExamSidebarProps) {
    return (
        <div className="space-y-4">
            <Card className="bg-white/5 border-white/5">
                <CardContent className="p-4 space-y-4">
                    <div>
                        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Questions</span>
                        <div className="flex items-center gap-2 text-xl font-bold text-white">
                            <HelpCircle className="w-5 h-5 text-[#323d8f]" />
                            {exam.questionsCount}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Passing</span>
                        <div className="flex items-center gap-2 text-xl font-bold text-white">
                            <Trophy className="w-5 h-5 text-[#323d8f]" />
                            {exam.passingScore}%
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Difficulty</span>
                        <div className="flex items-center gap-2 text-xl font-bold text-white capitalize">
                            <BarChart className="w-5 h-5 text-[#323d8f]" />
                            {exam.difficulty}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Button
                size="lg"
                className="w-full bg-[#323d8f] hover:bg-[#323d8f]/90 font-semibold"
                disabled={exam.status === 'upcoming'}
            >
                {exam.status === 'upcoming' ? 'Available Soon' : 'Start Exam'}
            </Button>
        </div>
    );
}
