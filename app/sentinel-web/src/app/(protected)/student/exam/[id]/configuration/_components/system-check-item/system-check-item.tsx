import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SystemCheckItemProps } from "../../_types";

export function SystemCheckItem({ icon, title, description, status }: SystemCheckItemProps) {
     return (
          <div className="p-2.5 sm:p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
               <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className={cn(
                         "p-1.5 rounded-md",
                         status === "success" && "bg-green-500/10 text-green-500",
                         status === "pending" && "bg-muted text-muted-foreground",
                         status === "info" && "bg-blue-500/10 text-blue-500"
                    )}>
                         {icon}
                    </div>
                    <div>
                         <div className="text-xs sm:text-sm font-medium">{title}</div>
                         <div className="text-[10px] sm:text-[11px] text-muted-foreground">{description}</div>
                    </div>
               </div>
               {status === "success" && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
          </div>
     );
}
