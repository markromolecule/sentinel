import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";
import { ExamHeroScoreProps } from "@/app/(protected)/student/history/details/_types";

export function ExamHeroScore({ percentage, status }: ExamHeroScoreProps) {
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-b from-[#323d8f]/20 to-[#1a1b26] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10 space-y-4">
                    <div className="text-white/60 font-medium">Final Result</div>

                    <div className={cn("text-7xl font-bold tracking-tighter",
                        status === "passed" ? "text-green-400" : "text-red-400"
                    )}>
                        {percentage}%
                    </div>

                    <Badge className={cn("px-4 py-1.5 text-base",
                        status === "passed" ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    )}>
                        {status === "passed" ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                        {status === "passed" ? "Passed" : "Failed"}
                    </Badge>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-[#1a1b26] border border-white/5 rounded-xl p-6 text-center space-y-2">
                <h3 className="text-white font-medium">Need Help?</h3>
                <p className="text-white/40 text-sm">If you believe there is an error in your result, please contact your professor.</p>
                <Button variant="outline" className="w-full mt-2 border-white/10 bg-transparent text-white hover:bg-white hover:text-black transition-colors">
                    Contact Support
                </Button>
            </div>
        </div>
    );
}
