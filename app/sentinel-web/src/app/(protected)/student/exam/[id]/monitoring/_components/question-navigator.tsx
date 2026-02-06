"use client";

import { useState } from "react";
import { ListTodo, Flag, Check, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
     Sheet,
     SheetContent,
     SheetHeader,
     SheetTitle,
     SheetTrigger,
} from "@/components/ui/sheet";
import { QuestionNavigatorProps } from "../_types";

// Internal component for the question list (shared between desktop and mobile)
function QuestionList({
     questions,
     currentIndex,
     answers,
     flaggedQuestions,
     onQuestionSelect,
     onClose,
}: QuestionNavigatorProps & { onClose?: () => void }) {
     return (
          <div className="grid gap-2">
               {questions.map((q, i) => {
                    const isAnswered = answers[q.id] !== undefined;
                    const isCurrent = currentIndex === i;
                    const isFlagged = flaggedQuestions.has(i);

                    return (
                         <button
                              key={q.id}
                              onClick={() => {
                                   onQuestionSelect(i);
                                   onClose?.();
                              }}
                              className={cn(
                                   "group flex items-center justify-between p-3 rounded-xl border transition-all duration-150 text-left",
                                   isCurrent
                                        ? "bg-[#4752c4] border-[#4752c4] text-white shadow-md active:scale-[0.98]"
                                        : isAnswered
                                             ? "bg-green-50/50 border-green-200/50 hover:bg-green-50"
                                             : "bg-background border-border/50 hover:border-primary/40 hover:bg-muted/30"
                              )}
                         >
                              <div className="flex items-center gap-3">
                                   <div
                                        className={cn(
                                             "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border transition-colors",
                                             isCurrent
                                                  ? "bg-white/20 border-white/40 text-white"
                                                  : isAnswered
                                                       ? "bg-green-500 border-green-500 text-white shadow-sm"
                                                       : "bg-muted/50 border-border/40 text-muted-foreground/60"
                                        )}
                                   >
                                        {i + 1}
                                   </div>
                                   <div className="flex flex-col">
                                        <span
                                             className={cn(
                                                  "text-xs font-bold leading-none mb-0.5",
                                                  isCurrent
                                                       ? "text-white"
                                                       : isAnswered
                                                            ? "text-green-700 font-black"
                                                            : "text-muted-foreground/80"
                                             )}
                                        >
                                             Item {i + 1}
                                        </span>
                                        {isAnswered && !isCurrent && (
                                             <span className="text-[8px] font-black uppercase text-green-600/70 tracking-tighter">
                                                  Completed
                                             </span>
                                        )}
                                   </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                   {isFlagged && (
                                        <Flag
                                             className={cn(
                                                  "w-3 h-3 fill-current",
                                                  isCurrent ? "text-white" : "text-orange-500"
                                             )}
                                        />
                                   )}
                                   {isAnswered && !isCurrent && (
                                        <Check className="w-3.5 h-3.5 text-green-500" />
                                   )}
                              </div>
                         </button>
                    );
               })}
          </div>
     );
}

// Desktop sidebar navigator
function DesktopNavigator(props: QuestionNavigatorProps) {
     const { questions, answers } = props;

     return (
          <aside className="hidden lg:flex lg:col-span-3 xl:col-span-3 border-l bg-muted/5 h-full flex-col overflow-hidden">
               <div className="p-4 md:p-6 space-y-4 flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex-none">
                         <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                   <ListTodo className="w-4 h-4 text-primary" />
                                   I. Identification
                              </h3>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                                   {Object.keys(answers).length} / {questions.length}
                              </span>
                         </div>
                    </div>

                    {/* Question List */}
                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                         <QuestionList {...props} />
                    </div>
               </div>
          </aside>
     );
}

// Mobile sheet navigator
function MobileNavigatorSheet(props: QuestionNavigatorProps) {
     const { questions, answers } = props;
     const [isOpen, setIsOpen] = useState(false);

     return (
          <div className="lg:hidden fixed right-4 bottom-24 z-40">
               <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                         <Button
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 rounded-full shadow-lg bg-background border-2"
                         >
                              <Menu className="h-5 w-5" />
                              <span className="sr-only">Open question navigator</span>
                         </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85%] sm:w-[350px] p-0">
                         <SheetHeader className="border-b px-4 py-3">
                              <div className="flex items-center justify-between">
                                   <SheetTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <ListTodo className="w-4 h-4 text-primary" />
                                        I. Identification
                                   </SheetTitle>
                                   <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                                        {Object.keys(answers).length} / {questions.length}
                                   </span>
                              </div>
                         </SheetHeader>
                         <div className="flex-1 overflow-y-auto p-4">
                              <QuestionList {...props} onClose={() => setIsOpen(false)} />
                         </div>
                    </SheetContent>
               </Sheet>
          </div>
     );
}

// Main exported component
export function QuestionNavigator(props: QuestionNavigatorProps) {
     return (
          <>
               <DesktopNavigator {...props} />
               <MobileNavigatorSheet {...props} />
          </>
     );
}
