import { useMemo, useState } from 'react';
import { Button } from '@sentinel/ui';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import type {
    ExaminationGlobalSettings,
    ExaminationGlobalSettingsRecord,
} from '@sentinel/shared/types';

import { Tabs, TabsList, TabsTrigger } from '@sentinel/ui';
import { StatusStrip } from '@/app/(protected)/(support)/telemetry/_components/shared/status-strip';
import { GeneralSettingsView } from './examination-views/general-settings-view';
import { BehaviorSettingsView } from './examination-views/behavior-settings-view';
import { SafeguardsView } from './examination-views/safeguards-view';
import { MonitoringView } from './examination-views/monitoring-view';
import { EssayRubricSettingsView } from './examination-views/essay-rubric-settings-view';

function createDefaultSettingsDraft(): ExaminationGlobalSettings {
    return {
        ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS,
        defaultAiRules: { ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultAiRules },
        defaultWebSecurity: { ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultWebSecurity },
        defaultMobileSecurity: { ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMobileSecurity },
    };
}

type ExaminationSettingsFormProps = {
    record?: ExaminationGlobalSettingsRecord;
    isPending?: boolean;
    onSubmit: (payload: ExaminationGlobalSettings) => void;
};

type NestedRuleSection = 'defaultAiRules' | 'defaultWebSecurity' | 'defaultMobileSecurity';

export type ExaminationSettingsSection =
    'overview' | 'general' | 'behavior' | 'safeguards' | 'monitoring' | 'rubric';

export function ExaminationSettingsForm({
    record,
    isPending,
    onSubmit,
}: ExaminationSettingsFormProps) {
    const [draft, setDraft] = useState<ExaminationGlobalSettings | null>(null);
    const [activeSection, setActiveSection] = useState<ExaminationSettingsSection>('overview');

    const syncedDraft = useMemo<ExaminationGlobalSettings>(() => {
        if (!record) return createDefaultSettingsDraft();

        return {
            ...record.value,
            defaultAiRules: {
                ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultAiRules,
                ...record.value.defaultAiRules,
            },
            defaultWebSecurity: {
                ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultWebSecurity,
                ...record.value.defaultWebSecurity,
            },
            defaultMobileSecurity: {
                ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMobileSecurity,
                ...record.value.defaultMobileSecurity,
            },
        };
    }, [record]);

    const currentDraft = draft ?? syncedDraft;
    const isDirty = Boolean(draft);

    const updateField = <K extends keyof ExaminationGlobalSettings>(
        key: K,
        value: ExaminationGlobalSettings[K],
    ) =>
        setDraft((current) => {
            const base = current ?? syncedDraft;
            return { ...base, [key]: value };
        });

    const updateNestedField = <
        TSection extends NestedRuleSection,
        TKey extends keyof ExaminationGlobalSettings[TSection],
    >(
        section: TSection,
        key: TKey,
        value: ExaminationGlobalSettings[TSection][TKey],
    ) =>
        setDraft((current) => ({
            ...(current ?? syncedDraft),
            [section]: {
                ...(current ?? syncedDraft)[section],
                [key]: value,
            },
        }));

    const metrics = useMemo(() => {
        const aiCount = Object.values(currentDraft.defaultAiRules).filter(Boolean).length;
        const webCount = Object.values(currentDraft.defaultWebSecurity).filter(Boolean).length;
        const mobileCount = Object.values(currentDraft.defaultMobileSecurity).filter(
            Boolean,
        ).length;

        return [
            {
                label: 'Baseline Duration',
                value: `${currentDraft.defaultDurationMinutes}m`,
                hint: 'Default attempt window',
            },
            {
                label: 'Security Tier',
                value: currentDraft.defaultStrictMode ? 'Strict' : 'Flexible',
                hint: `Rules: ${webCount}W / ${mobileCount}M`,
            },
            {
                label: 'AI Monitoring',
                value: aiCount > 0 ? 'Enhanced' : 'Baseline',
                hint: `${aiCount} active signals`,
            },
            {
                label: 'Fault Tolerance',
                value: `${currentDraft.defaultMaxReconnectAttempts} Tries`,
                hint: 'Reconnect allowance',
            },
        ];
    }, [currentDraft]);

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <div className="space-y-10">
                        <div className="space-y-1">
                            <h3 className="text-muted-foreground/80 text-[12px] font-semibold tracking-wider uppercase">
                                Governance
                            </h3>
                            <p className="text-foreground text-[14px] font-semibold">
                                Examination Baseline
                            </p>
                        </div>

                        <StatusStrip items={metrics} />

                        <div className="border-muted/50 bg-muted/5 border p-10 text-center">
                            <h3 className="text-foreground text-[13px] font-semibold">
                                Platform Integrity Policy
                            </h3>
                            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-[13px] leading-relaxed font-medium">
                                These settings define the default security and behavior posture for
                                all examinations. Changes are applied immediately to new attempts.
                            </p>
                        </div>
                    </div>
                );
            case 'general':
                return (
                    <GeneralSettingsView
                        draft={currentDraft}
                        isPending={!!isPending}
                        updateField={updateField}
                    />
                );
            case 'behavior':
                return (
                    <BehaviorSettingsView
                        draft={currentDraft}
                        isPending={!!isPending}
                        updateField={updateField}
                    />
                );
            case 'safeguards':
                return (
                    <SafeguardsView
                        draft={currentDraft}
                        isPending={!!isPending}
                        updateNestedField={updateNestedField}
                    />
                );
            case 'monitoring':
                return (
                    <MonitoringView
                        draft={currentDraft}
                        isPending={!!isPending}
                        updateNestedField={updateNestedField}
                    />
                );
            case 'rubric':
                return <EssayRubricSettingsView />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <Tabs
                value={activeSection}
                onValueChange={(v) => setActiveSection(v as ExaminationSettingsSection)}
                className="w-full"
            >
                <TabsList className="border-muted/30 h-auto w-full justify-start gap-10 rounded-none border-b bg-transparent p-0">
                    <TabsTrigger
                        value="overview"
                        className="text-muted-foreground/60 hover:text-foreground rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 py-4 text-[13px] font-semibold shadow-none transition-all outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-b-[#323d8f] data-[state=active]:bg-transparent data-[state=active]:text-[#323d8f] data-[state=active]:shadow-none"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="general"
                        className="text-muted-foreground/60 hover:text-foreground rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 py-4 text-[13px] font-semibold shadow-none transition-all outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-b-[#323d8f] data-[state=active]:bg-transparent data-[state=active]:text-[#323d8f] data-[state=active]:shadow-none"
                    >
                        General Baseline
                    </TabsTrigger>
                    <TabsTrigger
                        value="behavior"
                        className="text-muted-foreground/60 hover:text-foreground rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 py-4 text-[13px] font-semibold shadow-none transition-all outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-b-[#323d8f] data-[state=active]:bg-transparent data-[state=active]:text-[#323d8f] data-[state=active]:shadow-none"
                    >
                        Attempt Dynamics
                    </TabsTrigger>
                    <TabsTrigger
                        value="safeguards"
                        className="text-muted-foreground/60 hover:text-foreground rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 py-4 text-[13px] font-semibold shadow-none transition-all outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-b-[#323d8f] data-[state=active]:bg-transparent data-[state=active]:text-[#323d8f] data-[state=active]:shadow-none"
                    >
                        Safeguards
                    </TabsTrigger>
                    <TabsTrigger
                        value="monitoring"
                        className="text-muted-foreground/60 hover:text-foreground rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 py-4 text-[13px] font-semibold shadow-none transition-all outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-b-[#323d8f] data-[state=active]:bg-transparent data-[state=active]:text-[#323d8f] data-[state=active]:shadow-none"
                    >
                        AI Monitoring
                    </TabsTrigger>
                    <TabsTrigger
                        value="rubric"
                        className="text-muted-foreground/60 hover:text-foreground rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 py-4 text-[13px] font-semibold shadow-none transition-all outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-b-[#323d8f] data-[state=active]:bg-transparent data-[state=active]:text-[#323d8f] data-[state=active]:shadow-none"
                    >
                        Essay Rubric
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="min-w-0 flex-1">
                {renderContent()}

                {/* Footer Actions */}
                {activeSection !== 'rubric' && (
                    <div className="bg-background/95 sticky bottom-0 z-10 mt-20 border-t py-6 backdrop-blur-sm">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <div className="text-foreground text-[13px] font-semibold">
                                    {isDirty ? 'Baseline modified' : 'Governance baseline synced'}
                                </div>
                                <div className="text-muted-foreground text-[12px] font-medium opacity-60">
                                    {record?.updatedAt
                                        ? `Registry updated ${new Date(record.updatedAt).toLocaleDateString()}`
                                        : 'Awaiting baseline sync.'}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDraft(null)}
                                    disabled={isPending || !isDirty}
                                    className="h-10 rounded-none px-6 text-[12px] font-bold"
                                >
                                    Discard Changes
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => onSubmit(currentDraft)}
                                    disabled={isPending || !isDirty}
                                    className="h-10 rounded-none bg-[#323d8f] px-6 text-[12px] font-bold hover:bg-[#323d8f]/90"
                                >
                                    {isPending ? 'Syncing...' : 'Update Baseline'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
