"use client";

import { useExamConfigForm } from "@/app/(protected)/proctor/exams/configuration/_hooks/use-exam-config-form";
import { BasicInfoSection } from "@/app/(protected)/proctor/exams/configuration/_components/basic-info-section";
import { DeviceHardwareSection } from "@/app/(protected)/proctor/exams/configuration/_components/device-hardware-section";
import { AiRulesSection } from "@/app/(protected)/proctor/exams/configuration/_components/ai-rules-section";
import { SecuritySettingsSection } from "@/app/(protected)/proctor/exams/configuration/_components/security-settings-section";
import { Button } from "@/components/ui/button";
import {
    Form,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { ExamConfig } from "@/app/(protected)/admin/_types"; // Keeping admin types for now as they are re-exported shared types, or I can use shared directly

interface ExamConfigFormProps {
    defaultValues: ExamConfig;
}

export function ExamConfigForm({ defaultValues }: ExamConfigFormProps) {
    const { form, onSubmit } = useExamConfigForm({ defaultValues });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7 border-b">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl">Policy Settings</CardTitle>
                            <CardDescription>
                                Configure proctoring rules, security policies, and hardware requirements.
                            </CardDescription>
                        </div>
                        <Button type="submit">Save Changes</Button>
                    </CardHeader>
                    <Tabs defaultValue="rules" className="w-full">
                        <div className="border-b bg-muted/30 px-6 py-2">
                            <TabsList className="bg-transparent gap-6 h-auto p-0">
                                <TabsTrigger
                                    value="rules"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 transition-none"
                                >
                                    AI Proctoring
                                </TabsTrigger>
                                <TabsTrigger
                                    value="security"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 transition-none"
                                >
                                    Security & Stability
                                </TabsTrigger>
                                <TabsTrigger
                                    value="general"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 transition-none"
                                >
                                    General Policy
                                </TabsTrigger>
                                <TabsTrigger
                                    value="hardware"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 transition-none"
                                >
                                    Hardware
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <CardContent className="pt-6">
                            <TabsContent value="rules" className="mt-0 space-y-4">
                                <div className="max-w-4xl">
                                    <AiRulesSection />
                                </div>
                            </TabsContent>
                            <TabsContent value="security" className="mt-0 space-y-4">
                                <div className="max-w-4xl">
                                    <SecuritySettingsSection />
                                </div>
                            </TabsContent>
                            <TabsContent value="general" className="mt-0 space-y-4">
                                <div className="max-w-2xl">
                                    <BasicInfoSection />
                                </div>
                            </TabsContent>
                            <TabsContent value="hardware" className="mt-0 space-y-4">
                                <div className="max-w-3xl">
                                    <DeviceHardwareSection />
                                </div>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            </form>
        </Form>
    );
}
