import type { ChangeEvent, ReactNode } from 'react';
import { Activity, CheckCircle, Clock, FileCheck, Search, XCircle } from 'lucide-react';
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
    Badge,
    Button,
    Input,
    NativeSelect,
    NativeSelectOption,
} from '@sentinel/ui';
import type { ExamLobbyWaitingStudent } from '@sentinel/services';
import type {
    LobbyAdmissionGroups,
    LobbyAdmissionStatusFilter,
} from '../_lib/lobby-admission-filters';

type InstructorLobbyAdmissionPanelProps = {
    lobbyAdmissionGroups: LobbyAdmissionGroups;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: LobbyAdmissionStatusFilter;
    onStatusFilterChange: (value: LobbyAdmissionStatusFilter) => void;
    isUpdatingLobbyAdmissions: boolean;
    updatingStudentIds?: Set<string>;
    onUpdateLobbyAdmissions: (
        studentIds: string[],
        status: 'APPROVED' | 'REJECTED',
    ) => Promise<void>;
    overridingStudentId: string | null;
    onOverrideReconnect: (studentId: string) => Promise<void>;
};

type QueueSectionProps = {
    title: string;
    count: number;
    icon: ReactNode;
    accentColor: string;
    students: ExamLobbyWaitingStudent[];
    emptyLabel: string;
    headerAction?: ReactNode;
    children?: (student: ExamLobbyWaitingStudent) => ReactNode;
};

const STATUS_FILTER_LABELS: Record<LobbyAdmissionStatusFilter, string> = {
    all: 'All students',
    waiting: 'Waiting',
    approved: 'Approved',
    inAttempt: 'In attempt',
    submitted: 'Submitted',
    rejected: 'Rejected',
};

function formatCheckedInAt(value: string | null) {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'N/A'
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function StudentLobbyRow({
    student,
    children,
}: {
    student: ExamLobbyWaitingStudent;
    children?: ReactNode;
}) {
    return (
        <div className="bg-background hover:border-primary/30 flex flex-col gap-2 rounded-md border p-3 transition-colors">
            <div className="flex items-center gap-3">
                <Avatar size="sm" className="size-8">
                    <AvatarImage
                        src={student.avatarUrl ?? undefined}
                        alt={student.studentName}
                    />
                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                        {getInitials(student.studentName)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                        {student.studentName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {student.studentNumber ?? 'N/A'}
                    </p>
                </div>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px]">
                <span>{formatCheckedInAt(student.checkedInAt)}</span>
                <span aria-hidden="true">•</span>
                <span>
                    {student.reconnectCount} / {student.maxReconnectAttempts} reconnects
                </span>
            </div>
            {children ? <div className="mt-1 flex flex-col gap-1">{children}</div> : null}
        </div>
    );
}

function QueueSection({
    title,
    count,
    icon,
    accentColor,
    students,
    emptyLabel,
    headerAction,
    children,
}: QueueSectionProps) {
    return (
        <section
            className={`flex flex-col rounded-lg border-t-4 ${accentColor} h-full bg-slate-50/50`}
        >
            <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-slate-50/95 p-3 backdrop-blur">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h2 className="text-sm font-semibold">{title}</h2>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                            {count}
                        </Badge>
                    </div>
                </div>
                {headerAction}
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto p-2">
                {students.length === 0 ? (
                    <div className="text-muted-foreground border-border rounded-md border border-dashed px-2 py-8 text-center text-xs">
                        {emptyLabel}
                    </div>
                ) : (
                    students.map((student) => (
                        <StudentLobbyRow key={student.admissionId} student={student}>
                            {children?.(student)}
                        </StudentLobbyRow>
                    ))
                )}
            </div>
        </section>
    );
}

/**
 * InstructorLobbyAdmissionPanel renders searchable lobby queues and admission actions
 * in a 4-column kanban layout: Waiting, Approved, In Attempt, and Submitted.
 *
 * @param props - InstructorLobbyAdmissionPanelProps containing grouped admissions and controls.
 */
export function InstructorLobbyAdmissionPanel({
    lobbyAdmissionGroups,
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    isUpdatingLobbyAdmissions,
    updatingStudentIds,
    onUpdateLobbyAdmissions,
    overridingStudentId,
    onOverrideReconnect,
}: InstructorLobbyAdmissionPanelProps) {
    const { 
        waitingStudents, 
        approvedStudents, 
        inAttemptStudents,
        submittedStudents = [],
    } = lobbyAdmissionGroups;
    const hasActiveFilter = searchTerm.trim().length > 0 || statusFilter !== 'all';
    const waitingStudentIds = waitingStudents.map((student) => student.studentId);

    const handleStatusFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
        onStatusFilterChange(event.target.value as LobbyAdmissionStatusFilter);
    };

    return (
        <div className="flex min-h-[600px] flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative min-w-0 flex-1 md:max-w-md">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                        aria-label="Search lobby students"
                        placeholder="Search by name or student number"
                        value={searchTerm}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="bg-background pl-9"
                    />
                </div>

                <NativeSelect
                    aria-label="Filter lobby status"
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    className="bg-background w-full md:w-48"
                >
                    {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
                        <NativeSelectOption key={value} value={value}>
                            {label}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </div>

            <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <QueueSection
                    title="Waiting"
                    count={waitingStudents.length}
                    icon={<Clock className="h-4 w-4 text-amber-500" />}
                    accentColor="border-t-amber-500"
                    students={waitingStudents}
                    emptyLabel="No students waiting."
                    headerAction={
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            disabled={isUpdatingLobbyAdmissions || waitingStudentIds.length === 0}
                            onClick={() =>
                                void onUpdateLobbyAdmissions(waitingStudentIds, 'APPROVED')
                            }
                        >
                            Admit All
                        </Button>
                    }
                >
                    {(student) => {
                        const isRowUpdating = updatingStudentIds
                            ? updatingStudentIds.has(student.studentId)
                            : isUpdatingLobbyAdmissions;

                        return (
                            <div className="flex flex-col gap-1">
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        className="flex-1 text-xs"
                                        disabled={isRowUpdating}
                                        onClick={() =>
                                            void onUpdateLobbyAdmissions(
                                                [student.studentId],
                                                'APPROVED',
                                            )
                                        }
                                    >
                                        Admit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 text-xs"
                                        disabled={isRowUpdating}
                                        onClick={() =>
                                            void onUpdateLobbyAdmissions(
                                                [student.studentId],
                                                'REJECTED',
                                            )
                                        }
                                    >
                                        Reject
                                    </Button>
                                </div>
                                {student.hasActiveAttempt &&
                                    student.reconnectCount >= student.maxReconnectAttempts ? (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="w-full text-xs"
                                        disabled={overridingStudentId === student.studentId}
                                        onClick={() => void onOverrideReconnect(student.studentId)}
                                    >
                                        Override Limit
                                    </Button>
                                ) : null}
                            </div>
                        );
                    }}
                </QueueSection>

                <QueueSection
                    title="Approved"
                    count={approvedStudents.length}
                    icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
                    accentColor="border-t-emerald-600"
                    students={approvedStudents}
                    emptyLabel="No approved students."
                />

                <QueueSection
                    title="In Attempt"
                    count={inAttemptStudents.length}
                    icon={<Activity className="h-4 w-4 text-cyan-600" />}
                    accentColor="border-t-cyan-600"
                    students={inAttemptStudents}
                    emptyLabel="No active attempts."
                >
                    {(student) => (
                        <Badge variant="outline" className="justify-center text-[10px]">
                            {student.attemptStatus === 'IN_PROGRESS'
                                ? 'Writing'
                                : (student.attemptStatus ?? 'In Progress')}
                        </Badge>
                    )}
                </QueueSection>

                <QueueSection
                    title="Submitted"
                    count={submittedStudents.length}
                    icon={<FileCheck className="h-4 w-4 text-purple-600" />}
                    accentColor="border-t-purple-600"
                    students={submittedStudents}
                    emptyLabel="No submitted attempts."
                >
                    {() => (
                        <Badge
                            variant="outline"
                            className="border-purple-200 bg-purple-50 text-purple-700 justify-center text-[10px] dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300"
                        >
                            Submitted
                        </Badge>
                    )}
                </QueueSection>
            </div>
        </div>
    );
}
