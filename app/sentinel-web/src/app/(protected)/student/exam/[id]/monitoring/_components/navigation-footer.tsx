"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavigationFooterProps } from "../_types";

export function NavigationFooter({
     currentIndex,
     totalQuestions,
     answers,
     questions,
     onPrevious,
     onNext,
     onSubmit,
}: NavigationFooterProps) {
     const isFirst = currentIndex === 0;
     const isLast = currentIndex === totalQuestions - 1;

     return (
          <div className="hidden sm:flex mt-6 pt-6 border-t border-border/50 items-center justify-between max-w-4xl mx-auto w-full pb-10">
               <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    disabled={isFirst}
                    className="h-10 px-6 text-xs font-bold uppercase shadow-sm gap-2"
               >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
               </Button>

               {/* Progress Dots */}
               <div className="hidden md:flex gap-2">
                    {questions.map((q, i) => (
                         <div
                              key={i}
                              className={cn(
                                   "w-2 h-2 rounded-full transition-all duration-300",
                                   i === currentIndex
                                        ? "w-8 bg-primary"
                                        : answers[q.id] !== undefined
                                             ? "bg-primary/40"
                                             : "bg-muted"
                              )}
                         />
                    ))}
               </div>

               {isLast ? (
                    <Button
                         variant="default"
                         size="sm"
                         onClick={onSubmit}
                         className="h-10 px-8 text-xs font-bold uppercase shadow-lg bg-[#4752c4] hover:bg-[#3d46a8] text-white"
                    >
                         Finish Exam
                    </Button>
               ) : (
                    <Button
                         size="sm"
                         onClick={onNext}
                         className="h-10 px-8 text-xs font-bold uppercase shadow-md gap-2 bg-[#4752c4] hover:bg-[#3d46a8] text-white"
                    >
                         Next Item
                         <ChevronRight className="w-4 h-4" />
                    </Button>
               )}
          </div>
     );
}
