'use client';

import {
    Dialog,
    DialogContent,
    ScrollArea,
    Alert,
    AlertDescription,
    AlertTitle,
} from '@sentinel/ui';
import { AlertCircle } from 'lucide-react';
import { Institution } from '@sentinel/shared/types';
import { useInstitutionWizard } from '../wizard/_hooks/use-institution-wizard';
import { useWizardInitialization } from '../wizard/_hooks/use-wizard-initialization';
import { WizardHeader } from '../wizard/wizard-header';
import { WizardSidebar } from '../wizard/wizard-sidebar';
import { WizardFooter } from '../wizard/wizard-footer';
import { WizardStepsRenderer } from '../wizard/wizard-steps-renderer';
import { STEPS } from '../wizard/_constants';

interface InstitutionWizardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    institution?: Institution;
}

export function InstitutionWizardDialog({
    open,
    onOpenChange,
    institution,
}: InstitutionWizardDialogProps) {
    const {
        activeStep,
        draft,
        errors,
        isPublishing,
        lastSavedAt,
        summary,
        institutions,
        updateDraft,
        saveDraft,
        goNext,
        goBack,
        publishSetup,
        setDraft,
    } = useInstitutionWizard({
        editInstitutionId: institution?.id,
        onSuccess: () => onOpenChange(false),
    });

    const { isInitialDataLoading } = useWizardInitialization({
        open,
        institution,
        setDraft,
    });

    const isLastStep = activeStep === STEPS.length - 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={true}
                className="flex h-[90vh] w-full max-w-[95vw] flex-col overflow-hidden p-0 sm:max-w-[1200px]"
                onClick={(e) => e.stopPropagation()}
            >
                <WizardHeader
                    institution={institution}
                    activeStep={activeStep}
                    lastSavedAt={lastSavedAt}
                    onSaveDraft={saveDraft}
                />

                <div className="flex min-h-0 flex-1">
                    <WizardSidebar activeStep={activeStep} />

                    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
                        <ScrollArea className="min-h-0 flex-1">
                            <div className="mx-auto max-w-4xl px-8 py-8">
                                {errors.length > 0 && (
                                    <div className="mb-6">
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Validation Required</AlertTitle>
                                            <AlertDescription>
                                                <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                                                    {errors.map((error, i) => (
                                                        <li key={i}>{error}</li>
                                                    ))}
                                                </ul>
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}

                                <div className="min-h-[400px]">
                                    <WizardStepsRenderer
                                        activeStep={activeStep}
                                        isInitialDataLoading={isInitialDataLoading}
                                        draft={draft}
                                        institutions={institutions
                                            .filter((i) => i.institutionKind)
                                            .map((i) => ({
                                                id: i.id,
                                                name: i.name,
                                                institutionKind: i.institutionKind!,
                                            }))}
                                        summary={summary}
                                        updateDraft={updateDraft}
                                    />
                                </div>
                            </div>
                        </ScrollArea>

                        <WizardFooter
                            activeStep={activeStep}
                            isLastStep={isLastStep}
                            isPublishing={isPublishing}
                            isEditMode={!!institution}
                            onBack={goBack}
                            onNext={goNext}
                            onPublish={publishSetup}
                        />
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    );
}
