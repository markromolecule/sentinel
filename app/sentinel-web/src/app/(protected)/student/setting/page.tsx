import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MOCK_STUDENT } from "../_constants";
import { User, Bell, Palette, Lock } from "lucide-react";

export default function StudentSettingPage() {
    return (
        <div className="min-h-screen p-8 space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white">Settings</h1>
                <p className="text-white/60 text-lg">
                    Manage your account and preferences
                </p>
            </div>

            {/* Profile Information */}
            <Card className="glass-dark border-white/10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#323d8f]/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-[#323d8f]" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Profile Information</CardTitle>
                            <CardDescription className="text-white/60">
                                Your personal details and student information
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-white/60 text-sm">Full Name</Label>
                                <p className="text-white font-medium text-lg">{MOCK_STUDENT.name}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/60 text-sm">Student Number</Label>
                                <p className="text-white font-medium text-lg">
                                    {MOCK_STUDENT.studentNumber}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/60 text-sm">Email Address</Label>
                                <p className="text-white font-medium text-lg">{MOCK_STUDENT.email}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/60 text-sm">Enrollment Date</Label>
                                <p className="text-white font-medium text-lg">
                                    {new Date(MOCK_STUDENT.enrollmentDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-sm text-white/40">
                                💡 Contact your administrator to update your profile information
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="glass-dark border-white/10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Notification Preferences</CardTitle>
                            <CardDescription className="text-white/60">
                                Choose what notifications you want to receive
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div className="space-y-1">
                                <Label htmlFor="exam-reminders" className="text-white font-medium cursor-pointer">
                                    Exam Reminders
                                </Label>
                                <p className="text-sm text-white/60">
                                    Get notified about upcoming exams
                                </p>
                            </div>
                            <Checkbox
                                id="exam-reminders"
                                defaultChecked
                                className="border-white/30 data-[state=checked]:bg-[#323d8f] data-[state=checked]:border-[#323d8f]"
                            />
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div className="space-y-1">
                                <Label htmlFor="result-notifications" className="text-white font-medium cursor-pointer">
                                    Result Notifications
                                </Label>
                                <p className="text-sm text-white/60">
                                    Get notified when exam results are available
                                </p>
                            </div>
                            <Checkbox
                                id="result-notifications"
                                defaultChecked
                                className="border-white/30 data-[state=checked]:bg-[#323d8f] data-[state=checked]:border-[#323d8f]"
                            />
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div className="space-y-1">
                                <Label htmlFor="new-exams" className="text-white font-medium cursor-pointer">
                                    New Exams Available
                                </Label>
                                <p className="text-sm text-white/60">
                                    Get notified when new exams are published
                                </p>
                            </div>
                            <Checkbox
                                id="new-exams"
                                defaultChecked
                                className="border-white/30 data-[state=checked]:bg-[#323d8f] data-[state=checked]:border-[#323d8f]"
                            />
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div className="space-y-1">
                                <Label htmlFor="email-digest" className="text-white font-medium cursor-pointer">
                                    Weekly Email Digest
                                </Label>
                                <p className="text-sm text-white/60">
                                    Receive a weekly summary of your activity
                                </p>
                            </div>
                            <Checkbox
                                id="email-digest"
                                className="border-white/30 data-[state=checked]:bg-[#323d8f] data-[state=checked]:border-[#323d8f]"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card className="glass-dark border-white/10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Security</CardTitle>
                            <CardDescription className="text-white/60">
                                Manage your account security settings
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-white font-medium mb-2">Password</p>
                            <p className="text-sm text-white/60 mb-3">
                                Last changed: Never
                            </p>
                            <p className="text-xs text-white/40">
                                🔒 Contact your administrator to change your password
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-white font-medium mb-2">Session Management</p>
                            <p className="text-sm text-white/60">
                                Currently signed in on this device
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
