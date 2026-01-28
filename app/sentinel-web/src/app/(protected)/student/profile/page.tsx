"use client";

import { MOCK_STUDENT } from "@/app/(protected)/student/_constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function StudentProfilePage() {
    return (
        <div className="container mx-auto max-w-3xl p-6 space-y-8">
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-3xl font-bold ring-4 ring-border/10 shadow-2xl">
                    {MOCK_STUDENT.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground">{MOCK_STUDENT.name}</h1>
                    <p className="text-muted-foreground">{MOCK_STUDENT.email}</p>
                </div>
            </div>

            <Card className="bg-card border-border/50 text-foreground overflow-hidden">
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">First Name</label>
                            <p className="text-lg font-medium">{MOCK_STUDENT.firstName}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Name</label>
                            <p className="text-lg font-medium">{MOCK_STUDENT.lastName}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Student Number</label>
                            <p className="text-lg font-medium">{MOCK_STUDENT.studentNumber}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</label>
                            <p className="text-lg font-medium">{MOCK_STUDENT.department}</p>
                        </div>
                    </div>

                    <Separator className="bg-border" />

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Institution</label>
                        <p className="text-lg font-medium text-primary">{MOCK_STUDENT.institution}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card border-border/50 text-foreground overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                            <CardTitle className="text-foreground">Security</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Manage your account password
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-foreground/80">Current Password</Label>
                                <Input
                                    type="password"
                                    placeholder="Enter current password"
                                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground/80">New Password</Label>
                                <Input
                                    type="password"
                                    placeholder="Enter new password"
                                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground/80">Confirm New Password</Label>
                                <Input
                                    type="password"
                                    placeholder="Confirm new password"
                                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                Update Password
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
