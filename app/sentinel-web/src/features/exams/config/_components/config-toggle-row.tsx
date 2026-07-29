import {
    Badge,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    Switch,
    cn,
} from '@sentinel/ui';
import type { ExamConfigurationState } from '@sentinel/services';
import type { FieldPath } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

interface ConfigToggleRowProps {
    name: FieldPath<ExamConfigurationState>;
    label: string;
    description: string;
    className?: string;
    statusBadge?: string;
    statusDescription?: string;
    getChecked?: (value: unknown) => boolean;
    getValue?: (checked: boolean) => unknown;
}

export function ConfigToggleRow({
    name,
    label,
    description,
    className,
    statusBadge,
    statusDescription,
    getChecked,
    getValue,
}: ConfigToggleRowProps) {
    const { control } = useFormContext<ExamConfigurationState>();

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem
                    className={cn(
                        'border-border/60 flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-start sm:justify-between',
                        className,
                    )}
                >
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <FormLabel className="text-sm leading-none font-medium">
                                {label}
                            </FormLabel>
                            {statusBadge ? (
                                <Badge
                                    variant="outline"
                                    className="rounded-md px-2 py-0 text-[10px] uppercase"
                                >
                                    {statusBadge}
                                </Badge>
                            ) : null}
                        </div>
                        <FormDescription className="text-sm leading-relaxed">
                            {description}
                        </FormDescription>
                        {statusDescription ? (
                            <p className="text-muted-foreground text-xs leading-relaxed">
                                {statusDescription}
                            </p>
                        ) : null}
                    </div>
                    <FormControl>
                        <Switch
                            checked={getChecked ? getChecked(field.value) : Boolean(field.value)}
                            onCheckedChange={(checked) =>
                                field.onChange(getValue ? getValue(checked) : checked)
                            }
                            className="sm:mt-0.5"
                        />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}
