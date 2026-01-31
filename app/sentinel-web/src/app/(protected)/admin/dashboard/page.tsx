"use client";

import { AdminStatsCards, SystemHealth, ActiveSessionsWidget, FlaggedIncidentsWidget } from "@/app/(protected)/admin/dashboard/_components";
import { MOCK_SYSTEM_STATS, MOCK_RECENT_ACTIVITY } from "@/app/(protected)/admin/_constants";

export default function AdminDashboard() {
    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            </div>

            <div className="space-y-4">
                <AdminStatsCards stats={MOCK_SYSTEM_STATS} />

                <div className="grid gap-4 lg:grid-cols-2">
                    <ActiveSessionsWidget />
                    <FlaggedIncidentsWidget />
                </div>

                <SystemHealth recentActivity={MOCK_RECENT_ACTIVITY} />
            </div>
        </div>
    );
}
