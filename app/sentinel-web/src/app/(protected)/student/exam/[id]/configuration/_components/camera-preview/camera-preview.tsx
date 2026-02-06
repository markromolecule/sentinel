import { RefObject } from "react";
import { Camera, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CameraPreviewProps {
     hasCameraPermission: boolean | null;
     videoRef: RefObject<HTMLVideoElement | null>;
}

export function CameraPreview({
     hasCameraPermission,
     videoRef
}: CameraPreviewProps) {
     return (
          <Card className="border-border/50 bg-card/50 flex flex-col h-full ring-1 ring-border/50 shadow-sm overflow-hidden">
               <div className="relative flex-1 bg-black min-h-[200px] sm:min-h-[280px] lg:min-h-0">
                    {hasCameraPermission === null ? (
                         <div className="flex items-center justify-center w-full h-full">
                              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
                         </div>
                    ) : hasCameraPermission ? (
                         <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover transform scale-x-[-1]"
                         />
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive p-4 text-center">
                              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
                              <p className="text-sm">Camera access denied</p>
                         </div>
                    )}

                    {/* Status Overlays */}
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex justify-between items-start z-10">
                         <div className="bg-black/40 backdrop-blur-md text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium border border-white/10 shadow-lg">
                              <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span>Live Feed</span>
                         </div>

                         {hasCameraPermission ? (
                              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] sm:text-xs font-medium backdrop-blur-md shadow-lg">
                                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                   Online
                              </div>
                         ) : hasCameraPermission === false ? (
                              <div className="bg-red-500/20 border border-red-500/30 text-red-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium backdrop-blur-md">
                                   Offline
                              </div>
                         ) : null}
                    </div>
               </div>
               <CardFooter className="py-1.5 sm:py-2 px-2 sm:px-3 bg-muted/40 border-t border-border/50 text-[9px] sm:text-[10px] text-muted-foreground flex justify-between items-center gap-2">
                    <span>• Face visible</span>
                    <span>• Good lighting</span>
                    <span className="hidden xs:inline">• No other people</span>
               </CardFooter>
          </Card>
     );
}
