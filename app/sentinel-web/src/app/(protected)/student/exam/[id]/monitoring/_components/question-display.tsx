"use client";

import { Flag, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuestionDisplayProps } from "../_types";

export function QuestionDisplay({
     question,
     questionNumber,
     totalQuestions,
     selectedAnswer,
     isFlagged,
     onAnswer,
     onToggleFlag,
}: QuestionDisplayProps) {
     return (
          <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                         Question {questionNumber} of {totalQuestions}
                    </span>
                    <Button
                         variant="ghost"
                         size="sm"
                         onClick={onToggleFlag}
                         className={cn(
                              "h-7 px-3 gap-2 text-[10px] font-bold uppercase",
                              isFlagged
                                   ? "text-orange-600 bg-orange-50 hover:bg-orange-100"
                                   : "text-muted-foreground"
                         )}
                    >
                         <Flag className={cn("w-3.5 h-3.5", isFlagged && "fill-current")} />
                         {isFlagged ? "Flagged" : "Flag For Review"}
                    </Button>
               </div>

               <div className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-bold leading-tight text-foreground/90">
                         {question.text}
                    </h2>

                    <div className="grid gap-2.5 pt-2">
                         {question.options.map((option, i) => (
                              <button
                                   key={i}
                                   onClick={() => onAnswer(question.id, i)}
                                   className={cn(
                                        "group flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 text-left transition-all duration-150",
                                        selectedAnswer === i
                                             ? "bg-primary/5 border-primary shadow-sm"
                                             : "bg-background border-border hover:border-primary/40 hover:bg-muted/30"
                                   )}
                              >
                                   <div className="flex items-center gap-3 sm:gap-4">
                                        <div
                                             className={cn(
                                                  "w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-sm transition-colors",
                                                  selectedAnswer === i
                                                       ? "bg-primary border-primary text-white"
                                                       : "border-border/60 text-muted-foreground group-hover:border-primary/40"
                                             )}
                                        >
                                             {String.fromCharCode(65 + i)}
                                        </div>
                                        <span
                                             className={cn(
                                                  "text-base font-semibold",
                                                  selectedAnswer === i ? "text-primary" : "text-muted-foreground/80"
                                             )}
                                        >
                                             {option}
                                        </span>
                                   </div>
                                   {selectedAnswer === i && (
                                        <CheckCircle className="w-5 h-5 text-primary animate-in zoom-in duration-200" />
                                   )}
                              </button>
                         ))}
                    </div>
               </div>
          </div>
     );
}
