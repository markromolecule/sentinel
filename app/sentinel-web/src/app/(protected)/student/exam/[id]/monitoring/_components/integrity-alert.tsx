"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IntegrityAlertProps } from "../_types";

export function IntegrityAlert({ tabSwitches }: IntegrityAlertProps) {
     if (tabSwitches === 0) return null;

     return (
          <Alert
               variant="destructive"
               className="mb-6 py-2 px-4 border-red-500/20 bg-red-500/5 max-w-4xl mx-auto w-full"
          >
               <AlertTriangle className="h-4 w-4" />
               <AlertTitle className="text-xs font-bold uppercase tracking-widest">
                    Integrity Alert
               </AlertTitle>
               <AlertDescription className="text-xs opacity-90">
                    Navigation violations ({tabSwitches}) detected. Activity has been flagged and reported.
               </AlertDescription>
          </Alert>
     );
}
