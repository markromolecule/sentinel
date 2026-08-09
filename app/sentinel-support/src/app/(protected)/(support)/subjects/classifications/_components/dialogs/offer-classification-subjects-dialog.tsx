'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateSubjectOfferingsFromClassificationMutation } from '@sentinel/hooks';
import {
    classificationSubjectOfferingFormSchema,
    type ClassificationSubjectOfferingFormValues,
} from '@sentinel/shared/schema';
import { type SubjectClassification } from '@sentinel/shared/types';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Form,
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
import { useEffect, useRef } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { OfferingTargetPanels } from '@/app/(protected)/(support)/subjects/_components/forms/subject-offering-form-fields/offering-target-panels';
import { SelectionOverviewSection } from '@/app/(protected)/(support)/subjects/_components/forms/subject-offering-form-fields/selection-overview-section';
import { formatTermLabel } from '@/app/(protected)/(support)/subjects/_components/forms/subject-offering-form-fields/_helpers';
import { useSubjectOfferingFormData } from '@/app/(protected)/(support)/subjects/_components/forms/subject-offering-form-fields/_hooks/use-subject-offering-form-data';
import { type SubjectOfferingFormFieldsProps } from '@/app/(protected)/(support)/subjects/_components/forms/subject-offering-form-fields/_types';

interface OfferClassificationSubjectsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classification: SubjectClassification | null;
    institutionName?: string | null;
}

function toDefaultValues(
    classification: SubjectClassification | null,
): ClassificationSubjectOfferingFormValues {
    const departmentIds = classification?.department_id ? [classification.department_id] : [];

    return {
        subject_classification_id: classification?.id ?? '',
        term_id: '',
        department_ids: departmentIds,
        course_ids: classification?.course_ids ?? [],
        section_ids: [],
        year_levels: classification?.year_levels ?? [],
        institution_id: classification?.institution_id ?? null,
        duplicate_strategy: 'skip_existing',
    };
}

export function OfferClassificationSubjectsDialog({
    open,
    onOpenChange,
    classification,
    institutionName,
}: OfferClassificationSubjectsDialogProps) {
    const autoSelectedSectionsForRef = useRef<string | null>(null);
    const form = useForm<ClassificationSubjectOfferingFormValues>({
        resolver: zodResolver(
            classificationSubjectOfferingFormSchema,
        ) as Resolver<ClassificationSubjectOfferingFormValues>,
        defaultValues: toDefaultValues(classification),
    });

    const targetingForm = form as unknown as SubjectOfferingFormFieldsProps['form'];
    const offeringFormData = useSubjectOfferingFormData({
        form: targetingForm,
        subjectToOffer: null,
        open,
        institutionId: classification?.institution_id,
    });

    const createOfferings = useCreateSubjectOfferingsFromClassificationMutation({
        onSuccess: (result) => {
            toast.success(
                `${result.createdCount} subject offering${
                    result.createdCount === 1 ? '' : 's'
                } created.`,
            );
            onOpenChange(false);
            form.reset(toDefaultValues(classification));
        },
    });

    useEffect(() => {
        form.reset(toDefaultValues(classification));
        autoSelectedSectionsForRef.current = null;
    }, [classification, form, open]);

    useEffect(() => {
        if (!open || !classification) {
            return;
        }

        if (autoSelectedSectionsForRef.current === classification.id) {
            return;
        }

        if (
            offeringFormData.selectedSectionIds.length > 0 ||
            offeringFormData.sectionOptions.length === 0
        ) {
            return;
        }

        autoSelectedSectionsForRef.current = classification.id;
        offeringFormData.setSectionIds(
            offeringFormData.sectionOptions.map((sectionOption) => sectionOption.value),
        );
    }, [
        classification,
        offeringFormData,
        offeringFormData.sectionOptions,
        offeringFormData.selectedSectionIds.length,
        open,
    ]);

    function handleOpenChange(nextOpen: boolean) {
        onOpenChange(nextOpen);

        if (!nextOpen) {
            form.reset(toDefaultValues(classification));
        }
    }

    function onSubmit(values: ClassificationSubjectOfferingFormValues) {
        if (!classification) {
            return;
        }

        createOfferings.mutate({
            ...values,
            subject_classification_id: classification.id,
            institution_id: classification.institution_id ?? values.institution_id ?? null,
            department_ids: Array.from(new Set(values.department_ids ?? [])),
            course_ids: Array.from(new Set(values.course_ids ?? [])),
            section_ids: Array.from(new Set(values.section_ids ?? [])),
            year_levels: Array.from(new Set(values.year_levels ?? [])).sort(
                (left, right) => left - right,
            ),
            duplicate_strategy: values.duplicate_strategy ?? 'skip_existing',
        });
    }

    const subjectCount = classification?.subjectCount ?? classification?.subjects.length ?? 0;
    const hasOfferingScope = Boolean(
        classification?.department_id ||
        (classification?.course_ids?.length ?? 0) > 0 ||
        (classification?.year_levels?.length ?? 0) > 0,
    );
    const selectedSubjectLabel = classification
        ? `${classification.name} (${subjectCount} subject${subjectCount === 1 ? '' : 's'})`
        : 'Choose a classification';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="border-border/70 flex h-[90vh] max-h-[920px] min-h-[600px] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 2xl:w-[1480px] 2xl:max-w-none"
                overlayClassName="data-[state=open]:animate-none data-[state=closed]:animate-none"
            >
                <DialogHeader className="border-border/70 bg-muted/15 shrink-0 border-b px-5 pt-5 pb-4">
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-[10px] font-bold tracking-[0.05em] uppercase">
                            Classification Offering
                        </p>
                        <DialogTitle className="text-xl font-bold">
                            Offer Classification Subjects
                        </DialogTitle>
                    </div>
                    <DialogDescription className="max-w-3xl text-sm leading-5">
                        {classification
                            ? `Create term-based offerings for every subject inside "${classification.name}". Existing offerings for the selected term will be skipped.`
                            : 'Choose a classification, assign it to a term, and define who receives it.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-gutter:stable]">
                            <div className="grid gap-4 2xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,2.2fr)]">
                                <div className="space-y-4">
                                    <div className="border-border/60 bg-background rounded-xl border p-4">
                                        <div className="space-y-1">
                                            <p className="text-foreground text-[13px] font-bold tracking-tight uppercase">
                                                Offering Details
                                            </p>
                                            <p className="text-muted-foreground text-sm leading-5">
                                                Pick the term first, then review where all subjects
                                                in this classification should appear.
                                            </p>
                                        </div>

                                        <div className="mt-4 grid gap-4">
                                            <div className="bg-muted/20 rounded-lg border px-3 py-2">
                                                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                                                    Classification
                                                </p>
                                                <p className="text-foreground mt-1 line-clamp-2 text-sm font-semibold">
                                                    {selectedSubjectLabel}
                                                </p>
                                                {institutionName ? (
                                                    <p className="text-muted-foreground mt-1 text-xs">
                                                        {institutionName}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="term_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Term</FormLabel>
                                                        <Select
                                                            disabled={createOfferings.isPending}
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="h-10 text-sm">
                                                                    <SelectValue placeholder="Select a term" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {offeringFormData.semesters.map(
                                                                    (semester) => (
                                                                        <SelectItem
                                                                            key={semester.id}
                                                                            value={semester.id}
                                                                        >
                                                                            {formatTermLabel(
                                                                                semester.academicYear,
                                                                                semester.semester,
                                                                            )}
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription className="text-xs leading-4">
                                                            One offering will be created per
                                                            classification subject for this academic
                                                            period.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <SelectionOverviewSection
                                        selectedSubjectLabel={selectedSubjectLabel}
                                        selectedTermLabel={offeringFormData.selectedTermLabel}
                                        selectedTermDates={offeringFormData.selectedTermDates}
                                        selectedDepartments={offeringFormData.selectedDepartments}
                                        selectedCourses={offeringFormData.selectedCourses}
                                        selectedYearLevelLabels={
                                            offeringFormData.selectedYearLevelLabels
                                        }
                                        selectedSections={offeringFormData.selectedSections}
                                    />
                                </div>

                                <OfferingTargetPanels
                                    form={targetingForm}
                                    isPending={createOfferings.isPending}
                                    filteredCoursesCount={offeringFormData.filteredCourses.length}
                                    departmentOptions={offeringFormData.departmentOptions}
                                    courseOptions={offeringFormData.courseOptions}
                                    sectionOptions={offeringFormData.sectionOptions}
                                    yearLevelOptions={offeringFormData.yearLevelOptions}
                                    selectedDepartmentIds={offeringFormData.selectedDepartmentIds}
                                    selectedCourseIds={offeringFormData.selectedCourseIds}
                                    selectedYearLevels={offeringFormData.selectedYearLevels}
                                    selectedSectionIds={offeringFormData.selectedSectionIds}
                                    departmentSummary={offeringFormData.departmentSummary}
                                    courseSummary={offeringFormData.courseSummary}
                                    yearLevelSummary={offeringFormData.yearLevelSummary}
                                    sectionSummary={offeringFormData.sectionSummary}
                                    isDepartmentLocked={offeringFormData.isDepartmentLocked}
                                    isCourseLocked={offeringFormData.isCourseLocked}
                                    departmentSearch={offeringFormData.departmentSearch}
                                    courseSearch={offeringFormData.courseSearch}
                                    sectionSearch={offeringFormData.sectionSearch}
                                    onSetDepartmentIds={offeringFormData.setDepartmentIds}
                                    onSetCourseIds={offeringFormData.setCourseIds}
                                    onSetSectionIds={offeringFormData.setSectionIds}
                                    onSetYearLevels={offeringFormData.setYearLevels}
                                    onSetDepartmentSearch={offeringFormData.setDepartmentSearch}
                                    onSetCourseSearch={offeringFormData.setCourseSearch}
                                    onSetSectionSearch={offeringFormData.setSectionSearch}
                                    onToggleDepartment={offeringFormData.toggleDepartment}
                                    onToggleCourse={offeringFormData.toggleCourse}
                                    onToggleSection={offeringFormData.toggleSection}
                                    onToggleYearLevel={offeringFormData.toggleYearLevel}
                                />
                            </div>
                        </div>

                        {!hasOfferingScope ? (
                            <div className="border-border/70 border-t px-5 py-2">
                                <p className="text-destructive text-sm">
                                    This classification has no department, course, or year-level
                                    scope. Add a scope before creating subject offerings.
                                </p>
                            </div>
                        ) : null}

                        <DialogFooter className="border-border/70 bg-muted/10 border-t px-5 py-3 sm:justify-end">
                            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={createOfferings.isPending}
                                    onClick={() => handleOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        createOfferings.isPending ||
                                        !classification ||
                                        !subjectCount ||
                                        !classification.institution_id ||
                                        !hasOfferingScope
                                    }
                                    className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                                >
                                    {createOfferings.isPending ? 'Creating...' : 'Create Offerings'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
