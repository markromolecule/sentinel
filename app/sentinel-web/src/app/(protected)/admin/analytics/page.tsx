"use client";

import {
    AnalyticsReportsList,
    ExamCompletionChart,
    IncidentTrendsChart
} from "@/app/(protected)/admin/analytics/_components/index";
import { MOCK_REPORTS, MOCK_EXAM_COMPLETION_DATA, MOCK_INCIDENT_TRENDS } from "@/app/(protected)/admin/_constants";

export default function AnalyticsPage() {
    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ExamCompletionChart data={MOCK_EXAM_COMPLETION_DATA} />
                <IncidentTrendsChart data={MOCK_INCIDENT_TRENDS} />
            </div>
            <AnalyticsReportsList reports={MOCK_REPORTS} />
        </div>
    );
}
