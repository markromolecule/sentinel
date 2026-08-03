'use client';

import { cn } from '@sentinel/ui';
import { CheckboxItem } from './checkbox-item';
import type { CheckboxListProps } from './_types';

export function CheckboxList({
    title,
    options,
    selectedSet,
    disabled = false,
    onToggle,
    emptyMessage,
    isCompact = false,
    listClassName,
    minListHeight,
    groupId,
    onKeyDown,
    onWheelCapture,
}: CheckboxListProps) {
    return (
        <div
            className={cn(
                'bg-background mt-2 flex-1 overflow-y-auto overscroll-contain rounded-xl border px-1 py-1 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all [scrollbar-gutter:stable] focus-within:ring-1 focus-within:ring-[#323d8f]/20 focus-visible:outline-none',
                isCompact && 'max-h-[140px]',
                listClassName,
            )}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onWheelCapture={onWheelCapture}
            aria-label={`${title} options`}
            style={{ minHeight: isCompact ? undefined : minListHeight }}
        >
            <div className="space-y-0.5 p-1">
                {options.map((option) => {
                    const optionId = `${groupId}-${option.value.replace(/[^a-zA-Z0-9-_]/g, '-')}`;

                    return (
                        <CheckboxItem
                            key={option.value}
                            id={optionId}
                            option={option}
                            isSelected={selectedSet.has(option.value)}
                            disabled={disabled}
                            onToggle={onToggle}
                        />
                    );
                })}

                {options.length === 0 && (
                    <p className="text-muted-foreground py-2 text-sm">{emptyMessage}</p>
                )}
            </div>
        </div>
    );
}
