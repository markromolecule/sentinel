import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExamBannerProps } from "@/app/(protected)/student/_types";

export function ExamBanner({ exam }: ExamBannerProps) {
    return (
        <div className="h-48 md:h-64 relative bg-gradient-to-br from-primary to-primary/80">
            {/* Placeholder content since we don't have real stock images yet, using a pattern/gradient */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-20 h-20 text-primary-foreground/20" />
            </div>
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />

            <div className="absolute bottom-6 left-6 md:left-8">
                <Badge className={cn(
                    "capitalize shadow-sm mb-3",
                    exam.status === 'available' ? 'bg-primary text-primary-foreground' :
                        exam.status === 'upcoming' ? 'bg-amber-500 text-white' :
                            'bg-muted text-muted-foreground'
                )}>
                    {exam.status}
                </Badge>
                {/* Exam Title */}
                <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight drop-shadow-md">
                    {exam.title}
                </h1>
            </div>
        </div>
    );
}
