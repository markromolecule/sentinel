'use client';

import {
    Alert,
    AlertDescription,
    AlertTitle,
    Button,
    Card,
    CardContent,
    ScrollArea,
    Separator,
} from '@sentinel/ui';
import { AlertCircle, ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';
import { STEPS } from './_constants';
import { useInstitutionWizard } from './_hooks/use-institution-wizard';
import { StepStatus } from './_components/step-status';
import { IdentityStep } from './_components/steps/identity-step';
import { DepartmentsStep } from './_components/steps/departments-step';
import { CoursesStep } from './_components/steps/courses-step';
import { TermsStep } from './_components/steps/terms-step';
import { SubjectsStep } from './_components/steps/subjects-step';
import { NamingStep } from './_components/steps/naming-step';
import { ReviewStep } from './_components/steps/review-step';

export default function NewInstitutionWizardPage() {
    const {
        activeStep,
        draft,
        errors,
        isPublishing,
        lastSavedAt,
        summary,
        institutions,
        subjectBulkInput,
        subjectFileName,
        activeSubjectPreview,
        isParsingSubjects,
        setErrors,
        updateDraft,
        saveDraft,
        goNext,
        goBack,
        handleCancel,
        publishSetup,
        handleSubjectFileChange,
        setSubjectFilePreview,
        setSubjectFileName,
        applySubjectBulkRows,
        setSubjectBulkInput,
    } = useInstitutionWizard();

    const isLastStep = activeStep === STEPS.length - 1;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50/50">
            {/* Header */}
            <header className="border-border bg-card sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b px-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-[#323d8f]">
                        Institution Setup
                    </h1>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Step {activeStep + 1}:</span>
                        <span className="font-medium">{STEPS[activeStep]}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {lastSavedAt && (
                        <p className="text-muted-foreground mr-2 text-xs">
                            Draft saved at {lastSavedAt}
                        </p>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveDraft()}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Save Draft
                    </Button>
                </div>
            </header>

            <div className="flex min-h-0 flex-1">
                {/* Sidebar Navigation */}
                <aside className="border-border bg-card flex min-h-0 w-72 shrink-0 flex-col border-r">
                    <ScrollArea className="h-full">
                        <nav className="space-y-1 p-4">
                            {STEPS.map((step, index) => (
                                <button
                                    key={step}
                                    type="button"
                                    onClick={() => {}}
                                    disabled
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors"
                                >
                                    <StepStatus step={index} activeStep={activeStep} />
                                    <span
                                        className={
                                            index === activeStep
                                                ? 'text-sm font-semibold text-[#323d8f]'
                                                : 'text-muted-foreground text-sm font-medium'
                                        }
                                    >
                                        {step}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </ScrollArea>
                </aside>

                {/* Main Wizard Content */}
                <main className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <ScrollArea className="min-h-0 flex-1">
                        <div className="mx-auto max-w-5xl px-8 py-10">
                            <Card className="border-none shadow-none">
                                <CardContent className="p-0">
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

                                    {/* Steps */}
                                    <div className="min-h-[400px]">
                                        {activeStep === 0 && (
                                            <IdentityStep
                                                draft={draft}
                                                institutions={institutions
                                                    .filter((i) => i.institutionKind)
                                                    .map((i) => ({
                                                        id: i.id,
                                                        name: i.name,
                                                        institutionKind: i.institutionKind!,
                                                    }))}
                                                updateDraft={updateDraft}
                                            />
                                        )}
                                        {activeStep === 1 && (
                                            <DepartmentsStep
                                                draft={draft}
                                                summary={summary}
                                                updateDraft={updateDraft}
                                            />
                                        )}
                                        {activeStep === 2 && (
                                            <CoursesStep
                                                draft={draft}
                                                summary={summary}
                                                updateDraft={updateDraft}
                                            />
                                        )}
                                        {activeStep === 3 && (
                                            <TermsStep
                                                draft={draft}
                                                summary={summary}
                                                updateDraft={updateDraft}
                                            />
                                        )}
                                        {activeStep === 4 && (
                                            <SubjectsStep
                                                draft={draft}
                                                summary={summary}
                                                subjectBulkInput={subjectBulkInput}
                                                subjectFileName={subjectFileName}
                                                activeSubjectPreview={activeSubjectPreview}
                                                isParsingSubjects={isParsingSubjects}
                                                updateDraft={updateDraft}
                                                setSubjectBulkInput={setSubjectBulkInput}
                                                handleSubjectFileChange={handleSubjectFileChange}
                                                setSubjectFilePreview={setSubjectFilePreview}
                                                setSubjectFileName={setSubjectFileName}
                                                applySubjectBulkRows={applySubjectBulkRows}
                                            />
                                        )}
                                        {activeStep === 5 && (
                                            <NamingStep draft={draft} updateDraft={updateDraft} />
                                        )}
                                        {activeStep === 6 && <ReviewStep summary={summary} />}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>

                    {/* Footer Actions */}
                    <footer className="border-border bg-card mt-auto border-t p-6 shadow-[0_-1px_3px_0_rgba(0,0,0,0.05)]">
                        <div className="mx-auto flex max-w-5xl items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={goBack}
                                disabled={activeStep === 0 || isPublishing}
                                className="gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>

                            <div className="flex gap-3">
                                {isLastStep ? (
                                    <Button
                                        onClick={publishSetup}
                                        disabled={isPublishing}
                                        className="min-w-[140px] gap-2 bg-[#323d8f] hover:bg-[#323d8f]/90"
                                    >
                                        <Send className="h-4 w-4" />
                                        {isPublishing ? 'Publishing...' : 'Publish Setup'}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={goNext}
                                        className="min-w-[120px] gap-2 bg-[#323d8f] hover:bg-[#323d8f]/90"
                                    >
                                        Next Step
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}
