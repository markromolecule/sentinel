import { Button, Badge } from '@sentinel/ui';

type AttemptReportActionsProps = {
    editable: boolean;
    hasSubmitHandler: boolean;
    isSubmitting: boolean;
    onSaveOverrides: () => void;
    onSaveAndFinalize: () => void;
    isFinalized?: boolean;
};

export function AttemptReportActions({
    editable,
    hasSubmitHandler,
    isSubmitting,
    onSaveOverrides,
    onSaveAndFinalize,
    isFinalized = false,
}: AttemptReportActionsProps) {
    if (isFinalized) {
        return (
            <div className="flex items-center gap-2.5">
                <Badge
                    variant="outline"
                    className="border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                >
                    Report Finalized
                </Badge>
                <span className="text-muted-foreground text-xs">
                    This attempt report is locked and cannot be edited.
                </span>
            </div>
        );
    }

    if (!editable || !hasSubmitHandler) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={onSaveOverrides} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Overrides'}
            </Button>
            <Button onClick={onSaveAndFinalize} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save & Finalize Report'}
            </Button>
        </div>
    );
}
