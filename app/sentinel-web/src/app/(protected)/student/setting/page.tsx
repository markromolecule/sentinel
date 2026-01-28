"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Mic, Bell, Laptop, Camera } from "lucide-react";

export default function StudentSettingPage() {
    return (
        <div className="container mx-auto px-0 max-w-7xl space-y-8 py-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-4xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground text-lg">
                    Manage your preferences and permissions
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Proctoring Permissions */}
                <Card className="bg-card border-border/50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-foreground">Proctoring Permissions</CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Allow Sentinel to access your devices for proctoring
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <div className="space-y-1">
                                    <Label htmlFor="gaze-tracking" className="text-foreground font-medium cursor-pointer text-lg">
                                        Allow Gaze Tracking
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Required for monitoring eye movement during exams
                                    </p>
                                </div>
                                <Switch
                                    id="gaze-tracking"
                                    defaultChecked
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div className="space-y-1">
                                    <Label htmlFor="audio-recording" className="text-foreground font-medium cursor-pointer text-lg">
                                        Allow Audio Recording
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Required for monitoring background noise
                                    </p>
                                </div>
                                <Switch
                                    id="audio-recording"
                                    defaultChecked
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Device Preferences */}
                <Card className="bg-card border-border/50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Laptop className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-foreground">Device Preferences</CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Select your default input devices
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-foreground font-medium flex items-center gap-2">
                                        <Camera className="w-4 h-4 text-muted-foreground" />
                                        Camera Source
                                    </Label>
                                    <Select defaultValue="facetime">
                                        <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                            <SelectValue placeholder="Select camera" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-popover-foreground">
                                            <SelectItem value="facetime">FaceTime HD Camera</SelectItem>
                                            <SelectItem value="external">External Webcam</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-foreground font-medium flex items-center gap-2">
                                        <Mic className="w-4 h-4 text-muted-foreground" />
                                        Microphone Source
                                    </Label>
                                    <Select defaultValue="macbook">
                                        <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                            <SelectValue placeholder="Select microphone" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-popover-foreground">
                                            <SelectItem value="macbook">MacBook Pro Microphone</SelectItem>
                                            <SelectItem value="external">External Microphone</SelectItem>
                                            <SelectItem value="airpods">AirPods Pro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Preferences */}
                <Card className="bg-card border-border/50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle className="text-foreground">Notification Preferences</CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Manage your alerts and exam reminders
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <div className="space-y-1">
                                    <Label htmlFor="exam-reminders" className="text-foreground font-medium cursor-pointer text-lg">
                                        Exam Reminders
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Get notified 15 minutes before an exam starts
                                    </p>
                                </div>
                                <Switch
                                    id="exam-reminders"
                                    defaultChecked
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <div className="space-y-1">
                                    <Label htmlFor="results-released" className="text-foreground font-medium cursor-pointer text-lg">
                                        Results Released
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Get notified when your exam results are ready
                                    </p>
                                </div>
                                <Switch
                                    id="results-released"
                                    defaultChecked
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div className="space-y-1">
                                    <Label htmlFor="system-updates" className="text-foreground font-medium cursor-pointer text-lg">
                                        System Updates
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receive information about Sentinel app updates
                                    </p>
                                </div>
                                <Switch
                                    id="system-updates"
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
