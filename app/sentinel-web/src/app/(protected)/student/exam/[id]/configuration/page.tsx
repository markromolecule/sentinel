"use client";

import { useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Mic, Monitor, Smartphone, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Relative Imports
import { useSystemCheck } from "./_hooks/use-system-check";
import { CameraPreview, SystemCheckItem, MonitoringInfo } from "./_components";

export default function ExamConfigurationPage() {
     const router = useRouter();
     const params = useParams();
     const videoRef = useRef<HTMLVideoElement>(null);

     const {
          hasCameraPermission,
          hasMicPermission,
          isMobile,
          allChecksPassed
     } = useSystemCheck(videoRef);

     const handleEnterExam = () => {
          router.push(`/student/exam/${params.id}/monitoring`);
     };

     const handleBack = () => {
          router.back();
     };

     return (
          <div className="w-full min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-4 flex flex-col items-center justify-center gap-2 sm:gap-3 relative">
               {/* Navigation Header - Positioned at top-left */}
               <div className="absolute top-3 sm:top-4 lg:top-6 left-4 sm:left-6 lg:left-8">
                    <Button
                         variant="ghost"
                         size="sm"
                         onClick={handleBack}
                         className="gap-1 text-muted-foreground hover:text-foreground pl-0 hover:bg-transparent text-xs sm:text-sm"
                    >
                         <ChevronLeft className="w-4 h-4" />
                         <span className="hidden sm:inline">Back to Details</span>
                         <span className="sm:hidden">Back</span>
                    </Button>
               </div>

               <div className="max-w-5xl w-full grid lg:grid-cols-12 gap-2 sm:gap-3 lg:h-[500px] mt-10 sm:mt-0">
                    {/* Left Column: Camera Preview */}
                    <div className="lg:col-span-7 order-1 lg:order-1 flex flex-col min-h-[220px] sm:min-h-[280px] lg:min-h-0 lg:h-full">
                         <CameraPreview
                              hasCameraPermission={hasCameraPermission}
                              videoRef={videoRef}
                         />
                    </div>

                    {/* Right Column: Controls & Status */}
                    <div className="lg:col-span-5 order-2 lg:order-2 flex flex-col gap-2 sm:gap-3">
                         {/* Title */}
                         <div className="flex flex-col">
                              <h1 className="text-base sm:text-lg font-bold tracking-tight">System Check</h1>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                   Verify your identity and environment.
                              </p>
                         </div>

                         {/* Modular Status Card */}
                         <Card className="border-border/50 bg-card/50 ring-1 ring-border/50 shadow-sm flex-1 flex flex-col overflow-hidden">
                              <div className="flex-1 overflow-y-auto">
                                   <div className="divide-y divide-border/50">
                                        <SystemCheckItem
                                             icon={<Mic className="w-3.5 h-3.5" />}
                                             title="Audio Input"
                                             description={hasMicPermission ? "Microphone active" : "Checking availability..."}
                                             status={hasMicPermission ? "success" : "pending"}
                                        />
                                        <SystemCheckItem
                                             icon={isMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                                             title="Platform"
                                             description={isMobile ? "Mobile device" : "Desktop computer"}
                                             status="info"
                                        />
                                        <MonitoringInfo isMobile={isMobile} />
                                   </div>
                              </div>
                         </Card>

                         {/* Enter Button */}
                         <Button
                              size="lg"
                              variant="premium-3d"
                              onClick={handleEnterExam}
                              disabled={!allChecksPassed}
                              className="w-full text-xs sm:text-sm h-10 sm:h-11 shadow-md font-semibold"
                         >
                              {allChecksPassed ? "Enter Exam Room" : "Verifying System..."}
                         </Button>
                    </div>
               </div>
          </div>
     );
}
