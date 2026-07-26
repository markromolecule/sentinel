import * as React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@sentinel/ui';
import type { FooterConfig, HeaderConfig, PdfTemplate } from '@/data';
import { TemplateHeaderFooterFields } from './template-header-footer-fields';
import { TemplatePreviewCard } from './template-preview-card';
import { TemplateStatusCard } from './template-status-card';

type ScopeOption = {
    value: string;
    label: string;
};

type ReportTemplateEditorProps = {
    scopeValue: string;
    scopeOptions: ScopeOption[];
    onScopeChange: (value: string) => void;
    scopeHint?: string | null;
    scopeError?: string | null;
    isScopeLoading?: boolean;
    template: PdfTemplate | null;
    scopeLabel: string;
    hasUnsavedChanges: boolean;
    headerConfig: HeaderConfig;
    footerConfig: FooterConfig;
    onHeaderChange: (next: HeaderConfig) => void;
    onFooterChange: (next: FooterConfig) => void;
    isGeneratingPreview: boolean;
    onGeneratePreview: () => void;
    showResetOverride?: boolean;
    isResettingOverride?: boolean;
    onResetOverride?: () => void;
};

export function ReportTemplateEditor({
    scopeValue,
    scopeOptions,
    onScopeChange,
    scopeHint,
    scopeError,
    isScopeLoading,
    template,
    scopeLabel,
    hasUnsavedChanges,
    headerConfig,
    footerConfig,
    onHeaderChange,
    onFooterChange,
    isGeneratingPreview,
    onGeneratePreview,
    showResetOverride,
    isResettingOverride,
    onResetOverride,
}: ReportTemplateEditorProps) {
    const [activeTab, setActiveTab] = React.useState<'header' | 'footer'>('header');
    const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
    const panelRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        panelRef.current?.focus();
    }, [activeTab]);

    return (
        <div className="space-y-6">
            <section className="bg-background rounded-2xl border p-4">
                <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
                    <div className="space-y-2 xl:border-r xl:pr-4">
                        <Label htmlFor="report-template-scope">Template scope</Label>
                        <Select value={scopeValue} onValueChange={onScopeChange}>
                            <SelectTrigger id="report-template-scope">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {scopeOptions.map((scopeOption) => (
                                    <SelectItem key={scopeOption.value} value={scopeOption.value}>
                                        {scopeOption.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isScopeLoading ? (
                            <p className="text-muted-foreground text-xs">
                                Loading parent institutions…
                            </p>
                        ) : null}
                        {scopeError ? (
                            <p className="text-destructive text-xs">{scopeError}</p>
                        ) : null}
                        {scopeHint ? (
                            <p className="text-muted-foreground text-xs">{scopeHint}</p>
                        ) : null}
                    </div>

                    <div className="space-y-2 xl:border-r xl:px-4">
                        <TemplateStatusCard
                            template={template}
                            scopeLabel={scopeLabel}
                            hasUnsavedChanges={hasUnsavedChanges}
                            variant="inline"
                            className="min-w-0"
                        />
                        {showResetOverride ? (
                            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isResettingOverride}
                                    onClick={() => setResetDialogOpen(true)}
                                    className="w-full"
                                >
                                    {isResettingOverride ? 'Resetting...' : 'Reset to global'}
                                </Button>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Reset this override?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This removes the current institution draft override and
                                            restores the global Sentinel fallback for reports.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                onResetOverride?.();
                                                setResetDialogOpen(false);
                                            }}
                                        >
                                            Confirm reset
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : null}
                    </div>

                    <TemplatePreviewCard
                        isGenerating={isGeneratingPreview}
                        onGeneratePreview={onGeneratePreview}
                        variant="inline"
                        className="xl:pl-4"
                    />
                </div>
            </section>

            <div className="space-y-4">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(value as 'header' | 'footer')
                    }
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="header">Header</TabsTrigger>
                        <TabsTrigger value="footer">Footer</TabsTrigger>
                    </TabsList>

                    <div ref={panelRef} tabIndex={-1} className="outline-none">
                        <TabsContent value="header" className="mt-4 outline-none">
                            <TemplateHeaderFooterFields
                                headerConfig={headerConfig}
                                footerConfig={footerConfig}
                                onHeaderChange={onHeaderChange}
                                onFooterChange={onFooterChange}
                                isAnalyticsTemplate
                                section="header"
                                showSectionChrome={false}
                            />
                        </TabsContent>

                        <TabsContent value="footer" className="mt-4 outline-none">
                            <TemplateHeaderFooterFields
                                headerConfig={headerConfig}
                                footerConfig={footerConfig}
                                onHeaderChange={onHeaderChange}
                                onFooterChange={onFooterChange}
                                isAnalyticsTemplate
                                section="footer"
                                showSectionChrome={false}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
