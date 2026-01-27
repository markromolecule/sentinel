import { ExamHistory } from "@/app/(protected)/student/_types";

export interface ExamHeaderProps {
    subject: string;
    status: ExamHistory["status"];
}

export interface ExamInfoProps {
    title: string;
    dateTaken: string;
    timeSpent: number;
}

export interface ExamDetailStatsProps {
    score: number;
    totalScore: number;
    percentage: number;
}

export interface ExamHeroScoreProps {
    percentage: number;
    status: ExamHistory["status"];
}
