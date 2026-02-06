import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonitoringInfoProps {
     isMobile: boolean;
}

export function MonitoringInfo({ isMobile }: MonitoringInfoProps) {
     return (
          <div className="p-2.5 sm:p-3 bg-muted/10">
               <div className="flex items-start gap-2 sm:gap-2.5">
                    <div className={cn(
                         "p-1.5 rounded-md flex-shrink-0",
                         isMobile ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                         <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                         <div className="text-xs sm:text-sm font-medium">
                              {isMobile ? "Strict Focus Mode" : "Standard Monitoring"}
                         </div>
                         <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              {isMobile
                                   ? "Exiting the app is prohibited and will be logged."
                                   : "Switching tabs or minimizing will be flagged."}
                         </div>
                         <div className="grid grid-cols-2 gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
                              <div className="bg-background/50 border border-border/50 rounded px-1.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] text-muted-foreground text-center truncate">
                                   • Video Recorded
                              </div>
                              <div className="bg-background/50 border border-border/50 rounded px-1.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] text-muted-foreground text-center truncate">
                                   • Audio Recorded
                              </div>
                         </div>
                    </div>
               </div>
          </div>
     );
}
