"use client";

import { useExamConfigForm } from "@/app/(protected)/admin/exams/configuration/_hooks/use-exam-config-form";
import { BasicInfoSection } from "@/app/(protected)/admin/exams/configuration/_components/basic-info-section";
import { DeviceHardwareSection } from "@/app/(protected)/admin/exams/configuration/_components/device-hardware-section";
import { AiRulesSection } from "@/app/(protected)/admin/exams/configuration/_components/ai-rules-section";
import { SecuritySettingsSection } from "@/app/(protected)/admin/exams/configuration/_components/security-settings-section";
import { Button } from "@/components/ui/button";
import {
    Form,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExamConfig } from "@/app/(protected)/admin/_types";

interface ExamConfigFormProps {
    defaultValues: ExamConfig;
}

export function ExamConfigForm({ defaultValues }: ExamConfigFormProps) {
    const { form, onSubmit } = useExamConfigForm({ defaultValues });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Global Exam Settings</CardTitle>
                        <CardDescription>
                            Define system-wide rules for exam integrity and environment. Proctors will inherit these settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <BasicInfoSection />

                        <Separator />

                        <DeviceHardwareSection />

                        <Separator />

                        <AiRulesSection />

                        <Separator />

                        <SecuritySettingsSection />

                        <div className="flex justify-end">
                            <Button type="submit">Save Global Settings</Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}
