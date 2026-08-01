'use client';

import * as React from 'react';
import {
    Button,
    Label,
    PermissionDeniedState,
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
import {
    useActivePermissions,
    useAnswerKeyExportDownloadMutation,
    useAnswerKeyExportsQuery,
    useCreateAnswerKeyExportMutation,
    useDeleteAnswerKeyExportMutation,
    useExamsQuery,
    useInstitutionsQuery,
    usePdfTemplatesQuery,
    usePreviewPdfTemplateMutation,
    usePublishPdfTemplateMutation,
    useRetryAnswerKeyExportMutation,
    useSavePdfTemplateDraftMutation,
    type FooterConfig,
    type HeaderConfig,
} from '@/data';
import {
    AnswerKeyExportsPanel,
    PdfTemplatePageShell,
    TemplateHeaderFooterFields,
    TemplateStatusCard,
} from '../_components';
import { useAcademicScope } from '@/hooks/use-academic-scope';
import { ExternalLink, Eye } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_HEADER_CONFIG: HeaderConfig = {
    logo_visible: true,
    logo_placement: 'LEFT',
    logo_max_size_px: 120,
    title_text: 'Examination Answer Key',
    title_alignment: 'LEFT',
    subtitle_text: 'Authorized support export',
    subtitle_alignment: 'LEFT',
    divider_visible: true,
    divider_color: '#D1D5DB',
    accent_color: '#3B82F6',
    sentinel_logo_visible: false,
};

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
    text: 'Contains authorized answer key content.',
    confidentiality_label: 'Restricted',
    divider_visible: true,
    divider_color: '#E5E7EB',
    page_number_visible: true,
    page_number_format: 'PAGE_X_OF_Y',
};

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

export default function PdfTemplateExaminationsPage() {
    const { hasAnyPermission, hasPermission } = useActivePermissions();
    const { institutionId: scopedInstitutionId, isLoading: isAcademicScopeLoading } =
        useAcademicScope();
    const canView = hasAnyPermission(['pdf_templates:view', 'pdf_templates:manage']);
    const canManageTemplate = hasPermission('pdf_templates:manage');
    const canExportAnswerKey = hasPermission('examinations:export_answer_key');

    const { data: institutions = [] } = useInstitutionsQuery();
    const [selectedInstitutionId, setSelectedInstitutionId] = React.useState('');
    const [selectedExamId, setSelectedExamId] = React.useState('');
    const [activeTab, setActiveTab] = React.useState<'header' | 'footer' | 'answer-key'>('header');
    const [headerConfig, setHeaderConfig] = React.useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
    const [footerConfig, setFooterConfig] = React.useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
    const [activeDownloadId, setActiveDownloadId] = React.useState<string | null>(null);
    const [activeRetryId, setActiveRetryId] = React.useState<string | null>(null);
    const [activeDeleteId, setActiveDeleteId] = React.useState<string | null>(null);

    const scopedInstitution = React.useMemo(
        () => institutions.find((institution) => institution.id === scopedInstitutionId) ?? null,
        [institutions, scopedInstitutionId],
    );

    const availableInstitutions = React.useMemo(() => {
        if (!scopedInstitutionId) {
            return institutions;
        }

        if (!scopedInstitution) {
            return institutions.filter((institution) => institution.id === scopedInstitutionId);
        }

        if (scopedInstitution.institutionKind === 'PARENT') {
            return institutions.filter(
                (institution) =>
                    institution.id === scopedInstitutionId ||
                    institution.parentInstitutionId === scopedInstitutionId,
            );
        }

        return institutions.filter((institution) => institution.id === scopedInstitutionId);
    }, [institutions, scopedInstitution, scopedInstitutionId]);

    const isInstitutionLocked = Boolean(
        scopedInstitutionId &&
        (!scopedInstitution || scopedInstitution.institutionKind !== 'PARENT'),
    );

    const templatesQuery = usePdfTemplatesQuery({
        payload: {
            institutionId: selectedInstitutionId || null,
            documentKind: 'EXAM_ANSWER_KEY',
        },
        enabled: canView && Boolean(selectedInstitutionId),
    });

    const examsQuery = useExamsQuery(
        {
            institutionId: selectedInstitutionId || undefined,
            viewer: 'staff',
        },
        {
            enabled: canView && Boolean(selectedInstitutionId),
        },
    );

    const answerKeyExportsQuery = useAnswerKeyExportsQuery({
        payload: {
            institutionId: selectedInstitutionId || undefined,
            examId: selectedExamId || undefined,
            page: 1,
            limit: 20,
        },
        enabled: canView && Boolean(selectedInstitutionId),
    });

    const saveDraftMutation = useSavePdfTemplateDraftMutation();
    const publishMutation = usePublishPdfTemplateMutation();
    const previewMutation = usePreviewPdfTemplateMutation();
    const createExportMutation = useCreateAnswerKeyExportMutation();
    const downloadMutation = useAnswerKeyExportDownloadMutation();
    const retryMutation = useRetryAnswerKeyExportMutation();
    const deleteMutation = useDeleteAnswerKeyExportMutation();

    const draftTemplate = React.useMemo(
        () => templatesQuery.data?.find((template) => template.status === 'DRAFT') ?? null,
        [templatesQuery.data],
    );
    const publishedTemplate = React.useMemo(
        () => templatesQuery.data?.find((template) => template.status === 'PUBLISHED') ?? null,
        [templatesQuery.data],
    );
    const workingTemplate = draftTemplate ?? publishedTemplate;

    React.useEffect(() => {
        if (isAcademicScopeLoading) {
            return;
        }

        if (scopedInstitutionId) {
            setSelectedInstitutionId((current) => {
                if (
                    current &&
                    availableInstitutions.some((institution) => institution.id === current)
                ) {
                    return current;
                }

                if (
                    availableInstitutions.some(
                        (institution) => institution.id === scopedInstitutionId,
                    )
                ) {
                    return scopedInstitutionId;
                }

                return availableInstitutions[0]?.id ?? '';
            });
            return;
        }

        setSelectedInstitutionId((current) =>
            current && availableInstitutions.some((institution) => institution.id === current)
                ? current
                : '',
        );
    }, [availableInstitutions, isAcademicScopeLoading, scopedInstitutionId]);

    React.useEffect(() => {
        setHeaderConfig(workingTemplate?.header_config ?? DEFAULT_HEADER_CONFIG);
        setFooterConfig(workingTemplate?.footer_config ?? DEFAULT_FOOTER_CONFIG);
    }, [
        selectedInstitutionId,
        workingTemplate?.footer_config,
        workingTemplate?.header_config,
        workingTemplate?.template_id,
        workingTemplate?.updated_at,
    ]);

    React.useEffect(() => {
        if (!selectedExamId) {
            return;
        }

        if (!(examsQuery.data ?? []).some((exam) => exam.id === selectedExamId)) {
            setSelectedExamId('');
        }
    }, [examsQuery.data, selectedExamId]);

    const hasUnsavedChanges = React.useMemo(() => {
        return (
            JSON.stringify(workingTemplate?.header_config ?? DEFAULT_HEADER_CONFIG) !==
                JSON.stringify(headerConfig) ||
            JSON.stringify(workingTemplate?.footer_config ?? DEFAULT_FOOTER_CONFIG) !==
                JSON.stringify(footerConfig)
        );
    }, [footerConfig, headerConfig, workingTemplate]);

    if (!canView) {
        return <PermissionDeniedState resourceName="pdf templates" />;
    }

    return (
        <PdfTemplatePageShell
            title="Examination Answer Key"
            description="Manage answer key template settings and queue answer key PDF exports for a selected institution and exam."
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        disabled={
                            !selectedInstitutionId ||
                            !canManageTemplate ||
                            !hasUnsavedChanges ||
                            saveDraftMutation.isPending
                        }
                        onClick={async () => {
                            try {
                                await saveDraftMutation.mutateAsync({
                                    institution_id: selectedInstitutionId,
                                    document_kind: 'EXAM_ANSWER_KEY',
                                    header_config: headerConfig,
                                    footer_config: footerConfig,
                                });
                                toast.success('Draft saved');
                            } catch (error: unknown) {
                                toast.error(getErrorMessage(error, 'Failed to save the draft.'));
                            }
                        }}
                    >
                        {saveDraftMutation.isPending ? 'Saving...' : 'Save draft'}
                    </Button>
                    <Button
                        disabled={
                            !selectedInstitutionId ||
                            !canManageTemplate ||
                            !draftTemplate?.template_id ||
                            publishMutation.isPending
                        }
                        onClick={async () => {
                            if (!draftTemplate?.template_id) {
                                return;
                            }
                            try {
                                await publishMutation.mutateAsync({
                                    templateId: draftTemplate.template_id,
                                    institutionId: selectedInstitutionId,
                                    documentKind: 'EXAM_ANSWER_KEY',
                                });
                                toast.success('Template published');
                            } catch (error: unknown) {
                                toast.error(
                                    getErrorMessage(error, 'Failed to publish the template.'),
                                );
                            }
                        }}
                    >
                        {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <section className="bg-background rounded-2xl border p-3">
                    <div className="grid gap-4 xl:grid-cols-3 xl:items-stretch">
                        <div className="space-y-2 xl:border-r xl:pr-4">
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                                <p className="text-sm font-medium">Scope</p>
                                <p className="text-muted-foreground text-xs">
                                    {isInstitutionLocked
                                        ? 'Your branch scope is applied automatically.'
                                        : scopedInstitution?.institutionKind === 'PARENT'
                                          ? 'Choose a branch under your assigned parent institution.'
                                          : 'Select institution and exam.'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <Label htmlFor="answer-key-institution" className="text-xs">
                                        Institution
                                    </Label>
                                    <Select
                                        value={selectedInstitutionId}
                                        onValueChange={(value) => {
                                            setSelectedInstitutionId(value);
                                            setSelectedExamId('');
                                        }}
                                        disabled={isInstitutionLocked}
                                    >
                                        <SelectTrigger id="answer-key-institution" className="h-9">
                                            <SelectValue placeholder="Choose an institution" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableInstitutions.map((institution) => (
                                                <SelectItem
                                                    key={institution.id}
                                                    value={institution.id}
                                                >
                                                    {institution.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="answer-key-exam" className="text-xs">
                                        Exam
                                    </Label>
                                    <Select
                                        value={selectedExamId}
                                        onValueChange={setSelectedExamId}
                                        disabled={!selectedInstitutionId}
                                    >
                                        <SelectTrigger id="answer-key-exam" className="h-9">
                                            <SelectValue
                                                placeholder={
                                                    selectedInstitutionId
                                                        ? 'Choose an exam'
                                                        : 'Choose an institution first'
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(examsQuery.data ?? []).map((exam) => (
                                                <SelectItem key={exam.id} value={exam.id}>
                                                    {exam.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-2.5 xl:border-r xl:px-4">
                            <TemplateStatusCard
                                template={workingTemplate}
                                scopeLabel="Institution answer key template"
                                hasUnsavedChanges={hasUnsavedChanges}
                                variant="inline"
                            />
                            <div className="mt-auto border-t pt-2.5">
                                <p className="text-sm font-medium">Generate answer key</p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Queue an export for the selected institution and exam.
                                </p>
                                <Button
                                    size="sm"
                                    className="mt-2.5 w-full"
                                    disabled={
                                        !selectedInstitutionId ||
                                        !selectedExamId ||
                                        !canExportAnswerKey ||
                                        createExportMutation.isPending
                                    }
                                    onClick={async () => {
                                        try {
                                            await createExportMutation.mutateAsync({
                                                exam_id: selectedExamId,
                                                institution_id: selectedInstitutionId,
                                            });
                                            toast.success('Answer key export queued');
                                        } catch (error: unknown) {
                                            toast.error(
                                                getErrorMessage(
                                                    error,
                                                    'Failed to queue the answer key export.',
                                                ),
                                            );
                                        }
                                    }}
                                >
                                    {createExportMutation.isPending
                                        ? 'Queueing...'
                                        : 'Generate answer key'}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-2 xl:pl-4">
                            <p className="text-foreground/80 text-[11px] font-semibold tracking-[0.14em] uppercase">
                                Preview
                            </p>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Open PDF in a new tab</h3>
                                <p className="text-muted-foreground text-xs">
                                    Check the selected exam answer key with the unsaved template
                                    settings.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                className="mt-auto w-full"
                                disabled={
                                    !selectedInstitutionId ||
                                    !selectedExamId ||
                                    !canExportAnswerKey ||
                                    previewMutation.isPending
                                }
                                onClick={async () => {
                                    if (!selectedInstitutionId) {
                                        toast.error(
                                            'Choose an institution before generating a preview.',
                                        );
                                        return;
                                    }

                                    if (!selectedExamId) {
                                        toast.error('Choose an exam before generating a preview.');
                                        return;
                                    }

                                    if (!canExportAnswerKey) {
                                        toast.error(
                                            'You need answer-key export permission to preview correct answers.',
                                        );
                                        return;
                                    }

                                    const previewWindow = window.open('about:blank', '_blank');

                                    if (!previewWindow) {
                                        toast.error(
                                            'Allow pop-ups to open the PDF preview in a new tab.',
                                        );
                                        return;
                                    }

                                    try {
                                        const previewBlob = await previewMutation.mutateAsync({
                                            institution_id: selectedInstitutionId,
                                            exam_id: selectedExamId,
                                            document_kind: 'EXAM_ANSWER_KEY',
                                            header_config: headerConfig,
                                            footer_config: footerConfig,
                                        });
                                        const previewUrl = URL.createObjectURL(previewBlob);
                                        previewWindow.location.href = previewUrl;
                                        window.setTimeout(() => {
                                            URL.revokeObjectURL(previewUrl);
                                        }, 60_000);
                                    } catch (error: unknown) {
                                        previewWindow.close();
                                        toast.error(
                                            getErrorMessage(error, 'Failed to render the preview.'),
                                        );
                                    }
                                }}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                {previewMutation.isPending
                                    ? 'Generating preview...'
                                    : 'Generate preview'}
                                {!previewMutation.isPending ? (
                                    <ExternalLink className="ml-2 h-4 w-4" />
                                ) : null}
                            </Button>
                        </div>
                    </div>
                </section>

                <div className="space-y-4">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as 'header' | 'footer' | 'answer-key')
                        }
                    >
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="header">Header</TabsTrigger>
                            <TabsTrigger value="footer">Footer</TabsTrigger>
                            <TabsTrigger value="answer-key">Answer key</TabsTrigger>
                        </TabsList>

                        <TabsContent value="header" className="mt-4">
                            <TemplateHeaderFooterFields
                                headerConfig={headerConfig}
                                footerConfig={footerConfig}
                                onHeaderChange={setHeaderConfig}
                                onFooterChange={setFooterConfig}
                                section="header"
                                showSectionChrome={false}
                            />
                        </TabsContent>

                        <TabsContent value="footer" className="mt-4">
                            <TemplateHeaderFooterFields
                                headerConfig={headerConfig}
                                footerConfig={footerConfig}
                                onHeaderChange={setHeaderConfig}
                                onFooterChange={setFooterConfig}
                                section="footer"
                                showSectionChrome={false}
                            />
                        </TabsContent>

                        <TabsContent value="answer-key" className="mt-4">
                            <AnswerKeyExportsPanel
                                exports={answerKeyExportsQuery.data?.records ?? []}
                                canExport={canExportAnswerKey}
                                canManage={canExportAnswerKey}
                                activeDownloadId={activeDownloadId}
                                activeRetryId={activeRetryId}
                                activeDeleteId={activeDeleteId}
                                onDownload={async (exportId) => {
                                    try {
                                        setActiveDownloadId(exportId);
                                        const response =
                                            await downloadMutation.mutateAsync(exportId);
                                        window.open(
                                            response.downloadUrl,
                                            '_blank',
                                            'noopener,noreferrer',
                                        );
                                    } catch (error: unknown) {
                                        toast.error(
                                            getErrorMessage(
                                                error,
                                                'Failed to prepare the answer key download.',
                                            ),
                                        );
                                    } finally {
                                        setActiveDownloadId(null);
                                    }
                                }}
                                onRetry={async (exportId) => {
                                    try {
                                        setActiveRetryId(exportId);
                                        await retryMutation.mutateAsync({
                                            exportId,
                                            institutionId: selectedInstitutionId,
                                            examId: selectedExamId || undefined,
                                        });
                                        toast.success('Answer key retry queued');
                                    } catch (error: unknown) {
                                        toast.error(
                                            getErrorMessage(
                                                error,
                                                'Failed to retry the answer key export.',
                                            ),
                                        );
                                    } finally {
                                        setActiveRetryId(null);
                                    }
                                }}
                                onDelete={async (exportId) => {
                                    try {
                                        setActiveDeleteId(exportId);
                                        await deleteMutation.mutateAsync({
                                            exportId,
                                            institutionId: selectedInstitutionId,
                                            examId: selectedExamId || undefined,
                                        });
                                        toast.success('Answer key export deleted');
                                    } catch (error: unknown) {
                                        toast.error(
                                            getErrorMessage(
                                                error,
                                                'Failed to delete the answer key export.',
                                            ),
                                        );
                                    } finally {
                                        setActiveDeleteId(null);
                                    }
                                }}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </PdfTemplatePageShell>
    );
}
