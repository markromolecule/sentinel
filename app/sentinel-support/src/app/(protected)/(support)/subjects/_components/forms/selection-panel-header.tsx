import { type ReactNode } from 'react';
import { cn } from '@sentinel/ui';

interface SelectionPanelHeaderProps {
    title: string;
    selectedCount: number;
    helperText?: string;
    selectionSummary?: string;
    headerActionSlot?: ReactNode;
    actionSlot?: ReactNode;
    density?: 'default' | 'compact';
}

export function SelectionPanelHeader({
    title,
    selectedCount,
    helperText,
    selectionSummary,
    headerActionSlot,
    actionSlot,
    density = 'default',
}: SelectionPanelHeaderProps) {
    const isCompact = density === 'compact';

    return (
        <div className={cn('flex flex-col', isCompact ? 'gap-2' : 'gap-3')}>
            <div className={cn('space-y-2', isCompact ? 'min-h-[64px]' : 'min-h-[96px]')}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <p
                            className={cn(
                                'text-foreground font-bold tracking-tight uppercase',
                                isCompact ? 'text-[13px]' : 'text-[14px]',
                            )}
                        >
                            {title}
                        </p>
                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                            {selectedCount} selected
                        </span>
                    </div>
                </div>

                <div className="space-y-1">
                    {helperText && (
                        <p
                            className={cn(
                                'text-muted-foreground italic',
                                isCompact ? 'text-[10px] leading-4' : 'text-[11px] leading-relaxed',
                            )}
                        >
                            {helperText}
                        </p>
                    )}
                    {selectionSummary && (
                        <p
                            className={cn(
                                'text-muted-foreground line-clamp-1 leading-tight font-medium',
                                isCompact ? 'text-[10px]' : 'text-[11px]',
                            )}
                        >
                            {selectionSummary}
                        </p>
                    )}
                </div>
            </div>

            <div
                className={cn(
                    'flex items-center gap-2',
                    isCompact ? 'min-h-[40px]' : 'min-h-[44px]',
                )}
            >
                <div className="flex-1">{actionSlot}</div>
                {headerActionSlot}
            </div>
        </div>
    );
}
