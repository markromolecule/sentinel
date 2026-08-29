import { useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { useDebounce } from '@sentinel/hooks';
import {
    Badge,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    ScrollArea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@sentinel/ui';
import type { ExamReport } from '@sentinel/shared/types';
import {
    formatDateTime,
    formatPercent,
    getStatusBadgeVariant,
    getStatusLabel,
    getSubmissionTypeLabel,
    getAttemptKindLabel,
} from '../_helpers/report-helpers';

interface AttemptSummaryTableProps {
    students: ExamReport['students'];
}

export function AttemptSummaryTable({ students }: AttemptSummaryTableProps) {
    const [searchValue, setSearchValue] = useState('');
    const [sectionFilter, setSectionFilter] = useState('all');
    const debouncedSearchValue = useDebounce(searchValue, 300);

    const sectionOptions = useMemo(
        () =>
            Array.from(
                new Map(
                    students
                        .map((student) =>
                            student.sectionId && student.sectionName
                                ? ([student.sectionId, student.sectionName] as const)
                                : null,
                        )
                        .filter((entry): entry is readonly [string, string] => Boolean(entry)),
                ).entries(),
            ).sort((left, right) => left[1].localeCompare(right[1])),
        [students],
    );

    const visibleStudents = useMemo(() => {
        const normalizedSearch = debouncedSearchValue.trim().toLowerCase();

        return students.filter((student) => {
            if (sectionFilter !== 'all' && student.sectionId !== sectionFilter) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return [student.firstName, student.lastName, student.studentNo, student.sectionName]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearch);
        });
    }, [students, debouncedSearchValue, sectionFilter]);

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Attempt Summary Report</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Absentees stay in the list so the instructor can act on makeup and retake
                        decisions from the same report.
                    </p>
                </div>
                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                        <SelectTrigger className="w-full md:w-56">
                            <SelectValue placeholder="Filter by section" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All sections</SelectItem>
                            {sectionOptions.map(([sectionId, sectionName]) => (
                                <SelectItem key={sectionId} value={sectionId}>
                                    {sectionName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative w-full md:w-72">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                }
                            }}
                            placeholder="Search student"
                            className="pl-9"
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <ScrollArea className="w-full">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Student</TableHead>
                                <TableHead>Section</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Incidents</TableHead>
                                <TableHead>Submission</TableHead>
                                <TableHead>Review Outcomes</TableHead>
                                <TableHead>Timeline</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No students matched the current search.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleStudents.map((student) => (
                                    <TableRow key={`${student.id}-${student.attemptId ?? 'none'}`}>
                                        <TableCell className="min-w-56">
                                            <div className="font-medium">
                                                {student.lastName}, {student.firstName}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                {student.studentNo}
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {student.needsReview ? (
                                                    <Badge variant="destructive">
                                                        <AlertTriangle className="mr-1 h-3 w-3" />
                                                        Review
                                                    </Badge>
                                                ) : null}
                                                {student.needsMakeup ? (
                                                    <Badge variant="secondary">Makeup</Badge>
                                                ) : null}
                                                {student.needsRetake ? (
                                                    <Badge variant="outline">Retake</Badge>
                                                ) : null}
                                                {student.lifecycleState === 'LOCKED' && (
                                                    <Badge variant="destructive">Locked</Badge>
                                                )}
                                                {student.lifecycleState === 'CLOSED' && (
                                                    <Badge variant="secondary">Closed</Badge>
                                                )}
                                                {student.lifecycleState === 'SUPERSEDED' && (
                                                    <Badge variant="outline">Superseded</Badge>
                                                )}
                                                {student.isFinalized && (
                                                    <Badge variant="default">Finalized</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {student.sectionName ?? 'Unassigned'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(student.status)}>
                                                {getStatusLabel(student.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {student.score ?? 'N/A'} /{' '}
                                                {student.totalScore ?? 'N/A'}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                {formatPercent(student.percentage)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {student.incidentCount} total
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                {student.openIncidentCount} open
                                            </div>
                                            {student.primaryIncidentType ? (
                                                <div className="text-muted-foreground mt-2 text-xs">
                                                    Primary:{' '}
                                                    {student.primaryIncidentType.replaceAll(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {getSubmissionTypeLabel(student.submissionType)}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                {student.attemptCount} attempt
                                                {student.attemptCount === 1 ? '' : 's'}
                                            </div>
                                            <div className="text-muted-foreground text-xs">
                                                {getAttemptKindLabel(student.attemptKind)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                Pending {student.incidentOutcomes.pending}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                Reviewed {student.incidentOutcomes.reviewed} •
                                                Confirmed {student.incidentOutcomes.confirmed} •
                                                Dismissed {student.incidentOutcomes.dismissed}
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-56">
                                            <div className="text-sm">
                                                Started: {formatDateTime(student.startedAt)}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                Completed: {formatDateTime(student.completedAt)}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                Time spent:{' '}
                                                {student.timeSpentMinutes !== null
                                                    ? `${student.timeSpentMinutes} min`
                                                    : 'N/A'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
