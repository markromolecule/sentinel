'use client';

import type { ExaminationGlobalSettings } from '@sentinel/shared/types';
import type { ExamConfigurationState } from '@sentinel/services';
import { Badge, Form, Separator, Tabs, TabsContent, TabsList, TabsTrigger } from '@sentinel/ui';
import { useExamConfigForm } from '@/features/exams/config/_hooks/use-exam-config-form';
import { AiRulesSection } from '@/features/exams/config/_components/ai-rules-section';
import { DeviceHardwareSection } from '@/features/exams/config/_components/device-hardware-section';
import { ExamRulesSection } from '@/features/exams/config/_components/exam-rules-section';
import { SecuritySettingsSection } from '@/features/exams/config/_components/security-settings-section';

interface ExamConfigFormProps {
    defaultValues: ExamConfigurationState;
    examinationDefaults?: ExaminationGlobalSettings;
    onSubmit: (values: ExamConfigurationState) => Promise<void> | void;
    formId?: string;
}

function countEnabledRules(rules: Record<string, boolean>) {
    return Object.values(rules).filter(Boolean).length;
}

function countEnabledItems(values: boolean[]) {
    return values.filter(Boolean).length;
}

function TabHeader({
    title,
    description,
    badge,
}: {
    title: string;
    description: string;
    badge?: string;
}) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                        {description}
                    </p>
                </div>
                {badge ? (
                    <Badge variant="secondary" className="w-fit rounded-md px-2 py-0 text-[10px]">
                        {badge}
                    </Badge>
                ) : null}
            </div>
            <Separator />
        </div>
    );
}

export function ExamConfigForm({
    defaultValues,
    examinationDefaults,
    onSubmit,
    formId = 'proctor-config-form',
}: ExamConfigFormProps) {
    const { form, onSubmit: handleSubmit } = useExamConfigForm({ defaultValues, onSubmit });
    const values = form.watch();
    const enabledExamRules =
        countEnabledRules(values.settings) +
        (values.configuration.lobbyAdmissionMode === 'INSTRUCTOR_GATED' ? 1 : 0);
    const enabledAccessRules = countEnabledItems([
        values.configuration.cameraRequired,
        values.configuration.micRequired,
        values.configuration.strictMode,
        values.configuration.screenLock,
    ]);
    const enabledProtectionRules =
        countEnabledRules(values.configuration.aiRules) +
        countEnabledRules(values.configuration.webSecurity) +
        countEnabledRules(values.configuration.mobileSecurity);
    const reconnectAttempts = values.configuration.maxReconnectAttempts;
    const autoSubmitTimeout = values.configuration.autoSubmitTimeoutMinutes;

    return (
        <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(handleSubmit)}>
                <Tabs defaultValue="exam-flow" className="space-y-6">
                    <TabsList
                        variant="line"
                        className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none border-b p-0 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <TabsTrigger
                            value="exam-flow"
                            className="data-[state=active]:bg-muted/60 h-auto shrink-0 rounded-md px-3 py-2 text-sm font-medium"
                        >
                            Exam flow
                            <span className="text-muted-foreground ml-1 text-xs">
                                {enabledExamRules}/5
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="access-recovery"
                            className="data-[state=active]:bg-muted/60 h-auto shrink-0 rounded-md px-3 py-2 text-sm font-medium"
                        >
                            Access & permissions
                            <span className="text-muted-foreground ml-1 text-xs">
                                {enabledAccessRules}/4
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="monitoring"
                            className="data-[state=active]:bg-muted/60 h-auto shrink-0 rounded-md px-3 py-2 text-sm font-medium"
                        >
                            Monitoring
                            <span className="text-muted-foreground ml-1 text-xs">
                                {enabledProtectionRules} checks
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="exam-flow" className="m-0 pt-1">
                        <div className="space-y-8">
                            <TabHeader
                                title="Exam flow"
                                description="Control the student-facing exam behavior, including ordering, review, and post-submission feedback."
                                badge={`${enabledExamRules}/5 enabled`}
                            />
                            <ExamRulesSection examinationDefaults={examinationDefaults} />
                        </div>
                    </TabsContent>

                    <TabsContent value="access-recovery" className="m-0 pt-1">
                        <div className="space-y-6">
                            <TabHeader
                                title="Access & recovery"
                                description="Define the permissions students must grant and how the session responds when the connection drops."
                                badge={`${enabledAccessRules}/4 required`}
                            />
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-base font-semibold tracking-tight">
                                        Device requirements
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        These checks gate access to the exam experience.
                                    </p>
                                </div>
                                <DeviceHardwareSection />
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-base font-semibold tracking-tight">
                                        Recovery policy
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {`Allow up to ${reconnectAttempts} reconnect attempts with a ${autoSubmitTimeout}-minute auto-submit timeout.`}
                                    </p>
                                </div>
                                <SecuritySettingsSection />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="monitoring" className="m-0 pt-1">
                        <div className="space-y-8">
                            <TabHeader
                                title="Monitoring"
                                description="Turn on only the safeguards you want actively enforced during the exam session."
                                badge={`${enabledProtectionRules} active checks`}
                            />
                            <AiRulesSection />
                        </div>
                    </TabsContent>
                </Tabs>
            </form>
        </Form>
    );
}
