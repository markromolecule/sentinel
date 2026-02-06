"use client";

import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ExamHeaderProps } from "../_types";

export function ExamHeader({
     exam,
     timeLeft,
     isLowTime,
     progress,
     formatTime,
     onSubmit,
}: ExamHeaderProps) {
     return (
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur shadow-sm">
               <div className="container max-w-[1920px] h-14 flex items-center justify-between px-4 sm:px-6 lg:px-12">
                    <div className="flex flex-col justify-center">
                         <h1 className="text-base font-bold text-foreground leading-none mb-1">
                              {exam.title}
                         </h1>
                         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                              {exam.subject} • {exam.duration} Min • Score to Pass: {exam.passingScore}%
                         </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                         <div
                              className={cn(
                                   "flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold border shadow-sm transition-colors text-xs",
                                   isLowTime
                                        ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                                        : "bg-muted/50 text-foreground border-border"
                              )}
                         >
                              <Timer className="w-4 h-4" />
                              <span>{formatTime(timeLeft)}</span>
                         </div>
                         <Button
                              variant="default"
                              size="sm"
                              onClick={onSubmit}
                              className="h-8 px-4 sm:px-6 text-xs font-bold shadow-md hidden sm:inline-flex"
                         >
                              Submit Exam
                         </Button>
                    </div>
               </div>
               <Progress value={progress} className="h-1 rounded-none bg-muted" />
          </header>
     );
}
