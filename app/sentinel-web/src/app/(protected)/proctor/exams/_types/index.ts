import { ProctorExam } from "@/app/(protected)/proctor/_types";

export type ExamsPageHeaderProps = {
    onCreateClick: () => void;
};

export type ExamsFilterBarProps = {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    activeTab: string;
    onTabChange: (value: string) => void;
};

export type ExamsGridProps = {
    exams: ProctorExam[];
};

export type ExamCardProps = {
    exam: ProctorExam;
};

export type ExamEmptyStateProps = {
    isSearching: boolean;
    onCreateClick: () => void;
};
