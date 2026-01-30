export type FlagType = "tab_switch" | "gaze" | "audio" | "screenshot";

export type Flag = {
    id: string;
    type: FlagType;
    timestamp: string;
    description: string;
    severity: "low" | "medium" | "high";
    snapshotUrl?: string;
};

export type StudentSession = {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    status: "active" | "submitted" | "flagged" | "disconnected";
    progress: number;
    flags: Flag[];
    lastActivity: string;
};

export type ExamData = {
    id: string;
    title: string;
    subject: string;
    duration: number;
    startedAt: string;
    endsAt: string;
};

export type MonitoringHeaderProps = {
    examTitle: string;
    examSubject: string;
};

export type MonitoringStatsProps = {
    stats: {
        total: number;
        active: number;
        flagged: number;
        submitted: number;
    };
};

export type StudentListProps = {
    students: StudentSession[];
    selectedId: string | null;
    onSelect: (student: StudentSession) => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    filterStatus: string;
    onFilterChange: (value: string) => void;
};

export type StudentCardProps = {
    student: StudentSession;
    isSelected: boolean;
    onClick: () => void;
};

export type MonitoringDetailPanelProps = {
    student: StudentSession | null;
};

export type FlagEventListProps = {
    flags: Flag[];
};
