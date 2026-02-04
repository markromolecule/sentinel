import {
    GazeTrackingVisual,
    AudioAnalysisVisual,
    AnalyticsVisual
} from "../feature-section/_components/visuals";

import {Smartphone, Monitor, Bot, Coins, Headset} from "lucide-react";

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

export const FEATURES = [
  {
    name: "Supported Devices",
    description: "Access via modern web browsers or mobile apps",
    sentinel: "Mobile & Web",
    proctorU: "Desktop Only",
    seb: "Desktop Only",
    icon: Monitor
  },
  {
    name: "Tracking & Audio",
    description: "Live gaze tracking and automated audio flags",
    sentinel: true,
    proctorU: true,
    seb: false,
    icon: Bot
  },
  {
    name: "Native Mobile App",
    description: "Dedicated Android app for secure monitoring",
    sentinel: "Full Support",
    proctorU: "Limited to Web",
    seb: false,
    icon: Smartphone
  },
  {
    name: "Pricing Model",
    description: "Professional plans that fit any budget",
    sentinel: "Starts FREE",
    proctorU: "$15 / Session",
    seb: "Open-source",
    icon: Coins
  },
  {
    name: "Regional Support",
    description: "24/7 technical support based in the Philippines",
    sentinel: "Local",
    proctorU: "US-Based",
    seb: "Community",
    icon: Headset
  }
];