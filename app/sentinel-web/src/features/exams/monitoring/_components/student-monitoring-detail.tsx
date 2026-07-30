'use client';

import { StudentSession } from '@sentinel/shared/types';
import {
    StudentDetailHeader,
    StudentIdentityCard,
    LiveFeedMonitor,
    IntegrityTimelineCard,
} from '@/features/exams/monitoring/_components';

const LIVE_INSPECTION_ELIGIBLE_STATUSES = new Set<StudentSession['status']>(['active', 'flagged']);

interface StudentMonitoringDetailProps {
    student: StudentSession;
    examId: string;
    liveInspectionEnabled?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export function StudentMonitoringDetail({
    student,
    examId,
    liveInspectionEnabled = true,
    onRefresh,
    isRefreshing,
}: StudentMonitoringDetailProps) {
    const canStartLiveInspection =
        liveInspectionEnabled && LIVE_INSPECTION_ELIGIBLE_STATUSES.has(student.status);
    const firstEvidenceIncidentId =
        student.flags?.find(
            (flag) =>
                (flag.evidenceCount ?? 0) > 0 || Boolean(flag.evidenceUrl || flag.snapshotUrl),
        )?.id ?? null;

    return (
        <div className="mx-auto flex h-[calc(100vh-6rem)] w-full max-w-7xl flex-col gap-4 overflow-hidden px-4 pb-4">
            {/* Action Bar */}
            <StudentDetailHeader />

            {/* Main Content Layout */}
            <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr] gap-6 overflow-hidden lg:grid-cols-12">
                {/* Left Column: Student Info & Feed */}
                <div
                    data-lenis-prevent
                    className="scrollbar-none flex min-h-0 flex-col gap-4 overflow-y-auto pb-8 lg:col-span-4"
                >
                    <StudentIdentityCard student={student} />
                    <LiveFeedMonitor
                        examId={examId}
                        studentId={student.studentRecordId ?? student.id}
                        attemptId={student.attemptId}
                        enabled={canStartLiveInspection}
                    />

                    <div className="mt-auto py-2 opacity-40">
                        <p className="text-center font-mono text-[10px] tracking-[0.2em]">
                            SESSION_ID: {student.attemptId.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Right Column: Timeline */}
                <div
                    data-lenis-prevent
                    className="scrollbar-none min-h-0 overflow-y-auto pb-8 lg:col-span-8"
                >
                    <IntegrityTimelineCard
                        flags={student.flags ?? []}
                        examId={examId}
                        studentId={student.studentRecordId ?? student.id}
                        lifecycleEvents={student.lifecycleEvents ?? []}
                        onRefresh={onRefresh}
                        isRefreshing={isRefreshing}
                        focusIncidentId={firstEvidenceIncidentId}
                    />
                </div>
            </div>
        </div>
    );
}
