'use client';

import { Checkbox } from '@sentinel/ui';
import type { CheckboxItemProps } from './_types';

export function CheckboxItem({
    id,
    option,
    isSelected,
    disabled = false,
    onToggle,
}: CheckboxItemProps) {
    return (
        <label
            htmlFor={id}
            className="hover:bg-background/70 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors"
        >
            <Checkbox
                id={id}
                checked={isSelected}
                onCheckedChange={() => onToggle(option.value)}
                disabled={disabled}
            />
            <span
                className={`text-[13px] leading-5 ${
                    disabled ? 'text-muted-foreground' : 'text-foreground'
                }`}
            >
                {option.label}
            </span>
        </label>
    );
}
