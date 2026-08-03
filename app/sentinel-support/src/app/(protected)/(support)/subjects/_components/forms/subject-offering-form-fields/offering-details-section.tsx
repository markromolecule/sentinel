import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@sentinel/ui';
import { type SubjectOfferingFormFieldsProps } from './_types';
import { formatTermLabel } from './_helpers';

interface OfferingDetailsSectionProps {
    form: SubjectOfferingFormFieldsProps['form'];
    isPending: boolean;
    subjectToOffer?: SubjectOfferingFormFieldsProps['subjectToOffer'];
    subjects: Array<{ id?: string | null; code: string; title: string }>;
    semesters: Array<{ id: string; academicYear: string; semester: string }>;
}

export function OfferingDetailsSection({
    form,
    isPending,
    subjectToOffer,
    subjects,
    semesters,
}: OfferingDetailsSectionProps) {
    return (
        <div className="border-border/60 bg-background rounded-xl border p-4">
            <div className="space-y-1">
                <p className="text-foreground text-[13px] font-bold tracking-tight uppercase">
                    Offering Details
                </p>
                <p className="text-muted-foreground text-sm leading-5">
                    Pick the catalog subject and term first, then define where the offering should
                    appear.
                </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField
                    control={form.control}
                    name="subject_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Catalog Subject</FormLabel>
                            <Select
                                disabled={isPending || Boolean(subjectToOffer?.id)}
                                onValueChange={field.onChange}
                                value={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Select a subject" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem
                                            key={subject.id}
                                            value={subject.id ?? subject.code}
                                        >
                                            {subject.code} - {subject.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription className="text-xs leading-4">
                                Pick the master subject you want to make available this term.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="term_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Term</FormLabel>
                            <Select
                                disabled={isPending}
                                onValueChange={field.onChange}
                                value={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Select a term" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {semesters.map((semester) => (
                                        <SelectItem key={semester.id} value={semester.id}>
                                            {formatTermLabel(
                                                semester.academicYear,
                                                semester.semester,
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription className="text-xs leading-4">
                                The offering will be tied to this academic period.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
