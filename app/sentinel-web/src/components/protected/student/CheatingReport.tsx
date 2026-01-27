import { AlertTriangle, AppWindow, Camera, Eye, Maximize2, Mic, Smartphone, Video } from "lucide-react";
import { CheatingReportProps } from "@/components/protected/student/_constants";

export function CheatingReport({ cheated, cheatingType }: CheatingReportProps) {
    if (!cheated) return null;

    const getCheatingDetails = (type?: string) => {
        switch (type) {
            case 'gaze':
                return {
                    icon: Eye,
                    title: "Gaze Detected",
                    description: "Frequent looking away from the screen was detected."
                };
            case 'audio':
                return {
                    icon: Mic,
                    title: "Audio Detected",
                    description: "Suspicious audio levels or voices were detected."
                };
            case 'tab_switch':
                return {
                    icon: AppWindow,
                    title: "Tab Switch Detected",
                    description: "The exam window lost focus multiple times."
                };
            case 'screenshot':
                return {
                    icon: Camera,
                    title: "Screenshot Detected",
                    description: "An attempt to capture the screen was recorded."
                };
            case 'screen_record':
                return {
                    icon: Video,
                    title: "Screen Recording Detected",
                    description: "Screen recording software was active during the session."
                };
            case 'split_screen':
                return {
                    icon: Maximize2,
                    title: "Split Screen Detected",
                    description: "Split screen mode was activated on the device."
                };
            case 'device_leave':
                return {
                    icon: Smartphone,
                    title: "App Background Detected",
                    description: "The application was moved to the background."
                };
            default:
                return {
                    icon: AlertTriangle,
                    title: "Anomaly Detected",
                    description: "Unusual activity was flagged by the proctoring system."
                };
        }
    };

    const details = getCheatingDetails(cheatingType);
    const Icon = details.icon;

    return (
        <div className="space-y-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Proctoring Report
            </h3>

            <div className="bg-[#1a1b26] border border-red-500/20 rounded-xl overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                    <div className="p-2.5 bg-red-500/10 rounded-lg shrink-0">
                        <Icon className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-red-400 font-semibold text-base mb-1">
                            {details.title}
                        </h4>
                        <p className="text-white/60 text-sm leading-relaxed">
                            {details.description}
                        </p>
                    </div>
                </div>

                {/* Optional: Add a timeline or detailed log here if available in future */}
                <div className="bg-red-500/5 px-4 py-2 border-t border-red-500/10 flex items-center justify-between text-xs text-red-400/80">
                    <span>Severity: High</span>
                    <span>Time: Throughout Exam</span>
                </div>
            </div>
        </div>
    );
}
