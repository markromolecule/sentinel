import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ExamHeaderProps } from "@/app/(protected)/student/history/details/_types";

export function ExamHeader({ subject, status }: ExamHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <Button asChild variant="ghost" className="pl-0 text-white/60 hover:text-white hover:bg-transparent">
                <Link href="/student/history" className="flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" />
                    Back to History
                </Link>
            </Button>
            <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-white/10 text-white/60">
                    {subject}
                </Badge>
                <Badge className={cn(
                    "capitalize",
                    status === "passed" ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                )}>
                    {status}
                </Badge>
            </div>
        </div>
    );
}
