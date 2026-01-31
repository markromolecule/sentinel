"use client";

import { AdminStatsCards } from "@/app/(protected)/admin/_components/admin-stats-cards";
import { SystemHealth } from "@/app/(protected)/admin/_components/system-health";
import { MOCK_SYSTEM_STATS, MOCK_RECENT_ACTIVITY } from "@/app/(protected)/admin/_constants";

export default function AdminDashboard() {
    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            </div>

            <div className="space-y-4">
                <AdminStatsCards stats={MOCK_SYSTEM_STATS} />
                <SystemHealth recentActivity={MOCK_RECENT_ACTIVITY} />
            </div>
        </div>
    );
}
