import {
    GazeTrackingVisual,
    AudioAnalysisVisual,
    AnalyticsVisual
} from "../feature-section/_components/visuals";

export interface FEATURE {
    title: string;
    description: string;
    visual: React.ReactNode;
}

export const FEATURE_ITEMS: FEATURE[] = [
    {
        title: "Gaze Tracking",
        description: "Monitors eye & head movement patterns to detect suspicious behavior without being intrusive.",
        visual: <GazeTrackingVisual />
    },
    {
        title: "Audio Environment Analysis",
        description: "Monitors audio environment to detect communication or noise.",
        visual: <AudioAnalysisVisual />
    },
    {
        title: "Real-time Analytics",
        description: "Instant insights and detailed reports on exam sessions, flagging anomalies as they happen.",
        visual: <AnalyticsVisual />
    }
];