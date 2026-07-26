'use client';

import * as React from 'react';
import {
    Label,
    PermissionDeniedState,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@sentinel/ui';
import {
    useActivePermissions,
    useDeleteInstitutionPdfBrandingMutation,
    useInstitutionPdfBrandingQuery,
    useInstitutionsQuery,
    useUploadInstitutionPdfBrandingMutation,
} from '@/data';
import { BrandingUploadCard, PdfTemplatePageShell } from '../_components';
import { toast } from 'sonner';

const GLOBAL_SCOPE_VALUE = '__global__';

export default function PdfTemplateBrandingPage() {
    const { hasAnyPermission, hasPermission } = useActivePermissions();
    const canView = hasAnyPermission([
        'pdf_templates:view',
        'pdf_templates:manage',
        'institution_branding:manage',
    ]);
    const canManageBranding = hasPermission('institution_branding:manage');

    const parentInstitutionsQuery = useInstitutionsQuery({
        institutionKind: 'PARENT',
        enabled: canView,
    });
    const institutions = parentInstitutionsQuery.data ?? [];
    const [selectedScope, setSelectedScope] = React.useState<string>(GLOBAL_SCOPE_VALUE);
    const selectedInstitutionId = selectedScope === GLOBAL_SCOPE_VALUE ? null : selectedScope;

    const brandingQuery = useInstitutionPdfBrandingQuery(selectedInstitutionId, {
        enabled: canView && Boolean(selectedInstitutionId),
        retry: false,
    });

    const uploadBrandingMutation = useUploadInstitutionPdfBrandingMutation();
    const deleteBrandingMutation = useDeleteInstitutionPdfBrandingMutation();

    if (!canView) {
        return <PermissionDeniedState resourceName="institution branding" />;
    }

    const scopeOptions = [
        { value: GLOBAL_SCOPE_VALUE, label: 'Global (Sentinel)' },
        ...institutions.map((institution) => ({
            value: institution.id,
            label: institution.name,
        })),
    ];

    const scopeError = parentInstitutionsQuery.isError
        ? parentInstitutionsQuery.error?.message ||
          'Parent institutions could not be loaded. Global (Sentinel) is still available.'
        : null;

    const scopeHint = scopeError
        ? 'Global (Sentinel) remains available while parent institutions are unavailable.'
        : institutions.length === 0 && !parentInstitutionsQuery.isLoading
          ? 'No parent institutions are available yet. Global (Sentinel) remains available.'
          : 'Branding is configured per parent institution. Select a parent institution to upload or manage its logo.';

    return (
        <PdfTemplatePageShell
            title="Branding"
            description="Manage logo assets for parent-institution overrides in PDF reports."
        >
            <div className="max-w-2xl space-y-6">
                <section className="bg-background rounded-2xl border p-4">
                    <div className="space-y-2">
                        <Label htmlFor="branding-scope">Template scope</Label>
                        <Select value={selectedScope} onValueChange={setSelectedScope}>
                            <SelectTrigger id="branding-scope">
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
                        {parentInstitutionsQuery.isLoading ? (
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
                </section>

                <BrandingUploadCard
                    branding={brandingQuery.data ?? null}
                    disabled={!canManageBranding}
                    onUpload={async (file) => {
                        if (!selectedInstitutionId) {
                            toast.error('Choose a parent institution before uploading a logo.');
                            return;
                        }
                        try {
                            await uploadBrandingMutation.mutateAsync({
                                institutionId: selectedInstitutionId,
                                logo: file,
                            });
                            toast.success('Institution logo uploaded');
                        } catch (error: any) {
                            toast.error(error?.message || 'Failed to upload the logo.');
                        }
                    }}
                    onRemove={async () => {
                        if (!selectedInstitutionId) {
                            return;
                        }
                        try {
                            await deleteBrandingMutation.mutateAsync(selectedInstitutionId);
                            toast.success('Institution logo removed');
                        } catch (error: any) {
                            toast.error(error?.message || 'Failed to remove the logo.');
                        }
                    }}
                    isUploading={uploadBrandingMutation.isPending}
                    isRemoving={deleteBrandingMutation.isPending}
                    variant="panel"
                    globalMessage={
                        selectedInstitutionId
                            ? null
                            : 'Branding is available only for parent-institution overrides. Global (Sentinel) uses the standard platform identity.'
                    }
                />
            </div>
        </PdfTemplatePageShell>
    );
}
