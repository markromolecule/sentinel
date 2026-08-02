import { CardFooter, Button, Spinner } from '@sentinel/ui';
import Link from 'next/link';
import { ExamPrimaryAction } from '@/features/exams/_hooks/use-exam-card/_types';

interface ExamCardFooterProps {
    primaryActions: ExamPrimaryAction[];
}

export function ExamCardFooter({ primaryActions }: ExamCardFooterProps) {
    if (!primaryActions || primaryActions.length === 0) return null;

    return (
        <CardFooter className="mt-auto flex flex-row items-center gap-2 border-t px-4 pt-3">
            {primaryActions.map((action, i) => {
                const buttonContent = (
                    <>
                        {action.isLoading ? (
                            <Spinner className="h-4 w-4" />
                        ) : (
                            <action.icon className="h-4 w-4" />
                        )}
                        {action.label}
                    </>
                );

                if (action.href && !action.disabled) {
                    return (
                        <Button
                            key={i}
                            asChild
                            className="flex-1 gap-1.5"
                            variant={action.variant || 'default'}
                        >
                            <Link href={action.href} onClick={action.onClick}>
                                {buttonContent}
                            </Link>
                        </Button>
                    );
                }

                return (
                    <Button
                        key={i}
                        className="flex-1 gap-1.5"
                        variant={action.variant || 'default'}
                        onClick={action.onClick}
                        disabled={action.disabled}
                    >
                        {buttonContent}
                    </Button>
                );
            })}
        </CardFooter>
    );
}
