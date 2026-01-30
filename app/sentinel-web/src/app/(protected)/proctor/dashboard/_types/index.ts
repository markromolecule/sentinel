import { LucideIcon } from "lucide-react";
import { ProctorExam, Student } from "@/app/(protected)/proctor/_types";

export type DashboardStat = {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    href: string;
};

export type DashboardStatsProps = {
    stats: DashboardStat[];
};

export type RecentExamsProps = {
    exams: ProctorExam[];
};

export type RecentStudentsProps = {
    students: Student[];
};
