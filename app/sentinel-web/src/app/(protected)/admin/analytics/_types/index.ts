import { AnalyticsReport } from "@/app/(protected)/admin/_types";

export interface ChartProps {
    data: Record<string, unknown>[];
}

export interface AnalyticsReportsListProps {
    reports: AnalyticsReport[];
}
