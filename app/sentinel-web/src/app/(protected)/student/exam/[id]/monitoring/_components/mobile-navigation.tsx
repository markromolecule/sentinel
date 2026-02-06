"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNavigationProps } from "../_types";

export function MobileNavigation({
     currentIndex,
     totalQuestions,
     onPrevious,
     onNext,
     onSubmit,
}: MobileNavigationProps) {
     const isFirst = currentIndex === 0;
     const isLast = currentIndex === totalQuestions - 1;

     return (
          <div className="lg:hidden sticky bottom-0 w-full border-t bg-background px-6 py-3 flex items-center justify-between z-50 shadow-2xl">
               <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-full"
                    onClick={onPrevious}
                    disabled={isFirst}
               >
                    <ChevronLeft className="w-5 h-5" />
               </Button>

               <div className="text-xs font-black font-mono tracking-widest bg-muted/50 px-5 py-2 rounded-full border border-border/50">
                    {currentIndex + 1} OF {totalQuestions}
               </div>

               {isLast ? (
                    <Button
                         variant="default"
                         size="sm"
                         className="h-10 px-6 text-xs font-black uppercase"
                         onClick={onSubmit}
                    >
                         Finish
                    </Button>
               ) : (
                    <Button
                         size="sm"
                         className="h-10 w-10 p-0 rounded-full"
                         onClick={onNext}
                    >
                         <ChevronRight className="w-5 h-5" />
                    </Button>
               )}
          </div>
     );
}
