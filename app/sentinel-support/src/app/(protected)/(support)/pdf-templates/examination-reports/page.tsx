'use client';

import * as React from 'react';
import { Button, PermissionDeniedState } from '@sentinel/ui';
import {
    useActivePermissions,
    useInstitutionsQuery,
    usePreviewPdfTemplateMutation,
    usePdfTemplatesQuery,
    usePublishPdfTemplateMutation,
    useResetPdfTemplateOverrideMutation,
    useSavePdfTemplateDraftMutation,
    type FooterConfig,
    type HeaderConfig,
} from '@/data';
import { useAcademicScope } from '@/hooks/use-academic-scope';
import { PdfTemplatePageShell, ReportTemplateEditor } from '../_components';
import { toast } from 'sonner';

const GLOBAL_SCOPE_VALUE = '__global__';

const DEFAULT_HEADER_CONFIG: HeaderConfig = {
    logo_visible: true,
    logo_placement: 'LEFT',
    logo_max_size_px: 120,
    title_text: 'Examination Results Report',
    title_alignment: 'LEFT',
    subtitle_text: 'Sample preview for authorized support configuration',
    subtitle_alignment: 'LEFT',
    divider_visible: true,
    divider_color: '#D1D5DB',
    accent_color: '#3B82F6',
    sentinel_logo_visible: true,
};

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
    text: 'Preview template for examination results reports.',
    confidentiality_label: 'Sample',
    divider_visible: true,
    divider_color: '#E5E7EB',
    page_number_visible: true,
    page_number_format: 'PAGE_X_OF_Y',
};

function normalizeTemplateConfigs(
    template?: {
        header_config: HeaderConfig;
        footer_config: FooterConfig;
    } | null,
) {
    return {
        header: template?.header_config ?? DEFAULT_HEADER_CONFIG,
        footer: template?.footer_config ?? DEFAULT_FOOTER_CONFIG,
    };
}

export default function PdfTemplateExaminationReportsPage() {
    const { hasAnyPermission, hasPermission } = useActivePermissions();
    const { institutionId: scopedInstitutionId, isLoading: isAcademicScopeLoading } =
        useAcademicScope();
    const canView = hasAnyPermission(['pdf_templates:view', 'pdf_templates:manage']);
    const canManageTemplate = hasPermission('pdf_templates:manage');

    const institutionsQuery = useInstitutionsQuery({
        enabled: canView,
    });
    const institutions = institutionsQuery.data ?? [];
    const [selectedScope, setSelectedScope] = React.useState<string>(GLOBAL_SCOPE_VALUE);
    const selectedInstitutionId = selectedScope === GLOBAL_SCOPE_VALUE ? null : selectedScope;

    const scopedInstitution = React.useMemo(
        () => institutions.find((institution) => institution.id === scopedInstitutionId) ?? null,
        [institutions, scopedInstitutionId],
    );

    const accessibleInstitutions = React.useMemo(() => {
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

    React.useEffect(() => {
        if (isAcademicScopeLoading) {
            return;
        }

        setSelectedScope((current) => {
            if (current === GLOBAL_SCOPE_VALUE) {
                return current;
            }

            if (accessibleInstitutions.some((institution) => institution.id === current)) {
                return current;
            }

            return scopedInstitutionId || GLOBAL_SCOPE_VALUE;
        });
    }, [accessibleInstitutions, isAcademicScopeLoading, scopedInstitutionId]);

    const templatesQuery = usePdfTemplatesQuery({
        payload: {
            institutionId: selectedInstitutionId,
            documentKind: 'EXAM_RESULTS_REPORT',
        },
        enabled: canView,
    });

    const [headerConfig, setHeaderConfig] = React.useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
    const [footerConfig, setFooterConfig] = React.useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
    const saveDraftMutation = useSavePdfTemplateDraftMutation();
    const publishMutation = usePublishPdfTemplateMutation();
    const previewMutation = usePreviewPdfTemplateMutation();
    const resetOverrideMutation = useResetPdfTemplateOverrideMutation();

    const draftTemplate = React.useMemo(
        () => templatesQuery.data?.find((template) => template.status === 'DRAFT') ?? null,
        [templatesQuery.data],
    );
    const publishedTemplate = React.useMemo(
        () => templatesQuery.data?.find((template) => template.status === 'PUBLISHED') ?? null,
        [templatesQuery.data],
    );
    const workingTemplate = draftTemplate ?? publishedTemplate;
    const selectedInstitution = accessibleInstitutions.find(
        (institution) => institution.id === selectedInstitutionId,
    );

    React.useEffect(() => {
        const normalized = normalizeTemplateConfigs(workingTemplate);
        setHeaderConfig(normalized.header);
        setFooterConfig(normalized.footer);
    }, [workingTemplate?.template_id, workingTemplate?.updated_at, selectedScope]);

    const hasUnsavedChanges = React.useMemo(() => {
        const normalized = normalizeTemplateConfigs(workingTemplate);
        return (
            JSON.stringify(normalized.header) !== JSON.stringify(headerConfig) ||
            JSON.stringify(normalized.footer) !== JSON.stringify(footerConfig)
        );
    }, [footerConfig, headerConfig, workingTemplate]);

    if (!canView) {
        return <PermissionDeniedState resourceName="pdf templates" />;
    }

    const scopeOptions = [
        { value: GLOBAL_SCOPE_VALUE, label: 'Global (Sentinel)' },
        ...accessibleInstitutions.map((institution) => ({
            value: institution.id,
            label: institution.name,
        })),
    ];

    const scopeError = institutionsQuery.isError
        ? institutionsQuery.error?.message ||
          'Institution overrides could not be loaded. Global (Sentinel) is still available.'
        : null;

    const scopeHint = scopeError
        ? 'Global (Sentinel) remains available while institution overrides are unavailable.'
        : accessibleInstitutions.length === 0 && !institutionsQuery.isLoading
          ? 'No institution overrides are available yet. Global (Sentinel) remains available.'
          : scopedInstitution?.institutionKind === 'PARENT'
            ? 'Global templates act as the fallback. You can also choose your parent institution or one of its branches for an override.'
            : scopedInstitutionId
              ? 'Global templates act as the fallback. Your academic scope limits override editing to your assigned institution.'
              : 'Global templates act as the fallback. Selecting an institution creates an institution-specific override.';

    return (
        <PdfTemplatePageShell
            title="Examination Report"
            description="Manage the global fallback and institution-specific header, footer, preview, and publishing settings for examination results report PDFs."
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        disabled={
                            !canManageTemplate || !hasUnsavedChanges || saveDraftMutation.isPending
                        }
                        onClick={async () => {
                            try {
                                await saveDraftMutation.mutateAsync({
                                    institution_id: selectedInstitutionId,
                                    document_kind: 'EXAM_RESULTS_REPORT',
                                    header_config: headerConfig,
                                    footer_config: footerConfig,
                                });
                                toast.success('Draft saved');
                            } catch (error: any) {
                                toast.error(error?.message || 'Failed to save the draft.');
                            }
                        }}
                    >
                        {saveDraftMutation.isPending ? 'Saving...' : 'Save draft'}
                    </Button>
                    <Button
                        disabled={
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
                                    documentKind: 'EXAM_RESULTS_REPORT',
                                });
                                toast.success('Template published');
                            } catch (error: any) {
                                toast.error(error?.message || 'Failed to publish the template.');
                            }
                        }}
                    >
                        {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                    </Button>
                </div>
            }
        >
            <ReportTemplateEditor
                scopeValue={selectedScope}
                scopeOptions={scopeOptions}
                onScopeChange={setSelectedScope}
                scopeHint={scopeHint}
                scopeError={scopeError}
                isScopeLoading={institutionsQuery.isLoading || isAcademicScopeLoading}
                template={workingTemplate}
                scopeLabel={selectedInstitution ? selectedInstitution.name : 'Global (Sentinel)'}
                hasUnsavedChanges={hasUnsavedChanges}
                headerConfig={headerConfig}
                footerConfig={footerConfig}
                onHeaderChange={setHeaderConfig}
                onFooterChange={setFooterConfig}
                isGeneratingPreview={previewMutation.isPending}
                onGeneratePreview={async () => {
                    const previewWindow = window.open('about:blank', '_blank');

                    if (!previewWindow) {
                        toast.error('Allow pop-ups to open the PDF preview in a new tab.');
                        return;
                    }

                    try {
                        const previewBlob = await previewMutation.mutateAsync({
                            institution_id: selectedInstitutionId,
                            document_kind: 'EXAM_RESULTS_REPORT',
                            header_config: headerConfig,
                            footer_config: footerConfig,
                        });
                        const previewUrl = URL.createObjectURL(previewBlob);
                        previewWindow.location.href = previewUrl;

                        window.setTimeout(() => {
                            URL.revokeObjectURL(previewUrl);
                        }, 60_000);
                    } catch (error: any) {
                        previewWindow.close();
                        toast.error(error?.message || 'Failed to render the preview.');
                    }
                }}
                showResetOverride={Boolean(selectedInstitutionId && canManageTemplate)}
                isResettingOverride={resetOverrideMutation.isPending}
                onResetOverride={async () => {
                    if (!selectedInstitutionId) {
                        return;
                    }
                    try {
                        await resetOverrideMutation.mutateAsync({
                            institutionId: selectedInstitutionId,
                            documentKind: 'EXAM_RESULTS_REPORT',
                        });
                        toast.success('Draft override reset to global fallback');
                    } catch (error: any) {
                        toast.error(error?.message || 'Failed to reset the override.');
                    }
                }}
            />
        </PdfTemplatePageShell>
    );
}
