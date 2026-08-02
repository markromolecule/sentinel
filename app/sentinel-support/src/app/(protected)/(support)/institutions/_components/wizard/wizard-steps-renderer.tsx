import { Skeleton } from '@sentinel/ui';
import { IdentityStep } from './steps/identity-step';
import { TermsStep } from './steps/terms-step';
import { NamingStep } from './steps/naming-step';
import { DepartmentsStep } from './steps/departments-step';
import { CoursesStep } from './steps/courses-step';
import { SubjectsStep } from './steps/subjects-step';
import { ReviewStep } from './steps/review-step';
import { WizardDraft, SimpleInstitution, WizardSummary } from './_types';

export type WizardStepsRendererProps = {
    activeStep: number;
    isInitialDataLoading: boolean;
    draft: WizardDraft;
    institutions: SimpleInstitution[];
    summary: WizardSummary;
    updateDraft: (updater: (current: WizardDraft) => WizardDraft) => void;
};

export function WizardStepsRenderer({
    activeStep,
    isInitialDataLoading,
    draft,
    institutions,
    summary,
    updateDraft,
}: WizardStepsRendererProps) {
    if (isInitialDataLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-1/3" />
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        );
    }

    return (
        <>
            {activeStep === 0 && (
                <IdentityStep draft={draft} institutions={institutions} updateDraft={updateDraft} />
            )}
            {activeStep === 1 && (
                <TermsStep draft={draft} summary={summary} updateDraft={updateDraft} />
            )}
            {activeStep === 2 && <NamingStep draft={draft} updateDraft={updateDraft} />}
            {activeStep === 3 && (
                <DepartmentsStep draft={draft} summary={summary} updateDraft={updateDraft} />
            )}
            {activeStep === 4 && (
                <CoursesStep draft={draft} summary={summary} updateDraft={updateDraft} />
            )}
            {activeStep === 5 && (
                <SubjectsStep draft={draft} summary={summary} updateDraft={updateDraft} />
            )}
            {activeStep === 6 && <ReviewStep summary={summary} />}
        </>
    );
}
