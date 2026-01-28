import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, AppWindow, Calendar, Camera, ChevronRight, Clock, Eye, Mic, Video } from "lucide-react";
import Link from "next/link";
import { HistoryCardProps } from "../_types";

export function HistoryCard({ item }: HistoryCardProps) {
    return (
        <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-card border border-border/50 hover:border-primary/50 rounded-xl transition-all duration-200 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                {/* Unified Score Box */}
                <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-border bg-muted/50 shrink-0">
                    <span className="text-xl font-bold text-foreground">{item.score}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Score</span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                    <h3 className="text-foreground font-medium text-lg leading-tight group-hover:text-primary transition-colors truncate pr-2">
                        {item.examTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(item.dateTaken).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {item.timeSpent} min
                        </span>
                    </div>
                </div>
            </div>

            {/* Cheating Flag & Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-3 sm:gap-6 w-full md:w-auto pl-[4.5rem] md:pl-0 mt-2 md:mt-0">
                {/* Cheating Indicator */}
                {item.cheated && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive w-full sm:w-auto justify-center sm:justify-start">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                            Flagged:
                            {item.cheatingType === 'gaze' && <><Eye className="w-3 h-3 ml-1" /> Gaze</>}
                            {item.cheatingType === 'audio' && <><Mic className="w-3 h-3 ml-1" /> Audio</>}
                            {item.cheatingType === 'tab_switch' && <><AppWindow className="w-3 h-3 ml-1" /> Tab Switch</>}
                            {item.cheatingType === 'screenshot' && <><Camera className="w-3 h-3 ml-1" /> Screenshot</>}
                            {item.cheatingType === 'screen_record' && <><Video className="w-3 h-3 ml-1" /> Recording</>}
                            {item.cheatingType === 'multiple' && "Multiple"}
                        </span>
                    </div>
                )}

                {/* Status Text (Right Side) */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <span className={cn(
                        "text-sm font-bold uppercase tracking-wider",
                        item.status === "passed" ? "text-green-500" : "text-destructive"
                    )}>
                        {item.status}
                    </span>

                    <div className="h-8 w-px bg-border mx-2 hidden sm:block" />

                    <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-accent gap-2 transition-colors">
                        <Link href={`/student/history/details?id=${item.examId}`}>
                            Details
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
