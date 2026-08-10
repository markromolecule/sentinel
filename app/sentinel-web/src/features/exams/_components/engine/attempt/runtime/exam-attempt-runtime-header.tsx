import {
    Badge,
    Button,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@sentinel/ui';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

type ExamAttemptRuntimeHeaderProps = {
    answeredCount: number;
    totalQuestions: number;
    flaggedCount: number;
    showPassagePanel: boolean;
    onTogglePassagePanel: () => void;
    onToggleCompactPassage: () => void;
    hasPassage?: boolean;
    onSubmit: () => void;
    isSubmitting?: boolean;
};

export function ExamAttemptRuntimeHeader({
    answeredCount,
    totalQuestions,
    flaggedCount,
    showPassagePanel,
    onTogglePassagePanel,
    onToggleCompactPassage,
    hasPassage = true,
    onSubmit,
    isSubmitting,
}: ExamAttemptRuntimeHeaderProps) {
    return (
        <div className="contents">
            <Badge
                variant="secondary"
                className="order-2 rounded-md px-2.5 py-1 text-[11px] sm:order-none sm:px-3 sm:text-xs"
            >
                {answeredCount}/{totalQuestions} answered
            </Badge>
            <Badge
                variant="secondary"
                className="order-3 rounded-md px-2.5 py-1 text-[11px] sm:order-none sm:px-3 sm:text-xs"
            >
                {flaggedCount} flagged
            </Badge>

            {hasPassage ? (
                <>
                    {/* Phones: trigger the passage sheet. */}
                    <Button
                        type="button"
                        variant="outline"
                        className="order-4 h-10 flex-1 gap-2 rounded-md px-3 md:hidden"
                        onClick={onToggleCompactPassage}
                    >
                        <PanelLeftOpen className="h-4 w-4" />
                        <span>Show passage</span>
                    </Button>

                    {/* Tablets and larger screens: toggle the resizable passage panel. */}
                    <div className="hidden md:block">
                        <TooltipProvider delayDuration={150}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 gap-2 rounded-md px-3"
                                        onClick={onTogglePassagePanel}
                                    >
                                        {showPassagePanel ? (
                                            <PanelLeftClose className="h-4 w-4" />
                                        ) : (
                                            <PanelLeftOpen className="h-4 w-4" />
                                        )}
                                        <span>
                                            {showPassagePanel ? 'Hide passage' : 'Show passage'}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {showPassagePanel ? 'Hide passage panel' : 'Show passage panel'}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </>
            ) : null}

            <Button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="order-5 flex-1 rounded-md px-4 sm:order-none sm:flex-none sm:basis-auto"
            >
                {isSubmitting ? 'Preparing...' : 'Turn In'}
            </Button>
        </div>
    );
}
