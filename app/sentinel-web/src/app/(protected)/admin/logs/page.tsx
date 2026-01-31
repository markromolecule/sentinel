"use client";

import { AuditLogTable } from "../_components/audit-log-table";
import { MOCK_AUDIT_LOGS } from "../_constants";

export default function SystemLogsPage() {
    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
            </div>
            <AuditLogTable logs={MOCK_AUDIT_LOGS} />
        </div>
    );
}
