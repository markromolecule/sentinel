import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, HelpCircle, Trophy } from "lucide-react";
import { ExamSidebarProps } from "@/app/(protected)/student/_types";
import { useRouter } from "next/navigation";

export function ExamSidebar({ exam }: ExamSidebarProps) {
    const router = useRouter();
    return (
        <div className="space-y-4">
            <Card className="bg-muted/50 border-border/50">
                <CardContent className="p-4 space-y-4">
                    <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Questions</span>
                        <div className="flex items-center gap-2 text-xl font-bold text-foreground">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            {exam.questionCount}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Passing</span>
                        <div className="flex items-center gap-2 text-xl font-bold text-foreground">
                            <Trophy className="w-5 h-5 text-primary" />
                            {exam.passingScore}%
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Difficulty</span>
                        <div className="flex items-center gap-2 text-xl font-bold text-foreground capitalize">
                            <BarChart className="w-5 h-5 text-primary" />
                            {exam.difficulty}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Button
                size="lg"
                variant="premium-3d"
                className="w-full font-semibold"
                disabled={exam.status === 'upcoming'}
                onClick={() => router.push(`/student/exam/${exam.id}/configuration`)}
            >
                {exam.status === 'upcoming' ? 'Available Soon' : 'Start Exam'}
            </Button>
        </div>
    );
}
