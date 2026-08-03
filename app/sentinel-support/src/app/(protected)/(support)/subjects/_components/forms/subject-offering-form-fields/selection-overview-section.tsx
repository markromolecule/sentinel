import { SelectionPreview } from './selection-preview';
import { SummaryStat } from './summary-stat';

interface SelectionOverviewSectionProps {
    selectedSubjectLabel: string;
    selectedTermLabel: string;
    selectedTermDates: string | null;
    selectedDepartments: string[];
    selectedCourses: string[];
    selectedYearLevelLabels: string[];
    selectedSections: string[];
}

export function SelectionOverviewSection({
    selectedSubjectLabel,
    selectedTermLabel,
    selectedTermDates,
    selectedDepartments,
    selectedCourses,
    selectedYearLevelLabels,
    selectedSections,
}: SelectionOverviewSectionProps) {
    return (
        <div className="border-border/60 bg-muted/10 rounded-xl border p-4">
            <div className="space-y-1">
                <p className="text-foreground text-[13px] font-bold tracking-tight uppercase">
                    Selection Overview
                </p>
                <p className="text-muted-foreground text-sm leading-5">
                    Review the current targeting before you create the offering.
                </p>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <SummaryStat label="Subject" value={selectedSubjectLabel} tone="accent" />
                <SummaryStat
                    label="Term"
                    value={
                        selectedTermDates
                            ? `${selectedTermLabel} • ${selectedTermDates}`
                            : selectedTermLabel
                    }
                />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SelectionPreview
                    title="Departments"
                    items={selectedDepartments}
                    emptyLabel="No departments selected yet."
                    accent
                    visibleLimit={3}
                />
                <SelectionPreview
                    title="Courses"
                    items={selectedCourses}
                    emptyLabel="No courses selected yet."
                    visibleLimit={3}
                />
                <SelectionPreview
                    title="Year Levels"
                    items={selectedYearLevelLabels}
                    emptyLabel="No year levels selected yet."
                    visibleLimit={3}
                />
                <SelectionPreview
                    title="Sections"
                    items={selectedSections}
                    emptyLabel="No sections selected yet."
                    visibleLimit={3}
                />
            </div>
        </div>
    );
}
