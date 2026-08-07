'use client';

import { Check, Circle } from 'lucide-react';
import { cn } from '@sentinel/ui';
import { PASSWORD_REQUIREMENTS } from '@/app/auth/update-password/_constants';

interface RequirementProps {
    met: boolean;
    text: string;
}

function Requirement({ met, text }: RequirementProps) {
    return (
        <div
            className={cn(
                'flex items-center gap-2 text-xs transition-colors duration-200',
                met ? 'text-green-500' : 'font-medium text-gray-500',
            )}
        >
            {met ? (
                <Check className="h-3.5 w-3.5" />
            ) : (
                <Circle className="h-3.5 w-3.5 fill-current opacity-20" />
            )}
            <span>{text}</span>
        </div>
    );
}

interface PasswordRequirementsProps {
    value: string;
    isVisible?: boolean;
}

export function PasswordRequirements({ value = '', isVisible = false }: PasswordRequirementsProps) {
    const requirements = PASSWORD_REQUIREMENTS(value);

    if (!isVisible) return null;

    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
            {requirements.map((req, index) => (
                <Requirement key={index} met={req.met} text={req.text} />
            ))}
        </div>
    );
}
