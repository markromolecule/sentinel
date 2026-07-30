import type { ComponentType } from 'react';
import { ArrowLeft, Copy } from 'lucide-react';
import { Button } from '@sentinel/ui';

type QuestionBuilderHeaderProps = {
    builderMode: boolean;
    description: string;
    icon: ComponentType<{ className?: string }>;
    isComplete: boolean;
    label: string;
    onBack: () => void;
    onDuplicate?: () => void;
    onSave: () => void;
    showDuplicateAction: boolean;
    isEditing: boolean;
};

export function QuestionBuilderHeader({
    builderMode,
    description,
    icon: Icon,
    isComplete,
    label,
    onBack,
    onDuplicate,
    onSave,
    showDuplicateAction,
    isEditing,
}: QuestionBuilderHeaderProps) {
    const titleBlock = (
        <div className="flex items-center gap-4">
            <div className="border-border/60 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border">
                <Icon className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
                <h2 className="text-lg font-semibold tracking-tight">{label}</h2>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
        </div>
    );

    if (!builderMode) {
        return titleBlock;
    }

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {titleBlock}
            <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" /> Cancel
                </Button>
                {showDuplicateAction ? (
                    <Button variant="outline" disabled={!isComplete} onClick={onDuplicate}>
                        <Copy className="h-4 w-4" /> Duplicate
                    </Button>
                ) : null}
                <Button disabled={!isComplete} onClick={onSave}>
                    {isEditing ? 'Save Changes' : 'Create'}
                </Button>
            </div>
        </div>
    );
}
