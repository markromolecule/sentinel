'use client';

import { useCallback, useMemo, useState } from 'react';
import {
    useExamMonitoringStudentQuery,
    useMonitoringRealtime,
    type StudentProgressPayload,
    type StudentSubmittedPayload,
} from '@sentinel/hooks';
import { StudentMonitoringDetail } from '@/features/exams/monitoring/_components/student-monitoring-detail';
import { useParams } from 'next/navigation';
import { Spinner } from '@sentinel/ui';

export default function StudentMonitoringPage() {
    const params = useParams();
    const studentId = params.studentId as string;
    const examId = params.id as string;
    const {
        data: student,
        isLoading,
        isError,
        isFetching,
        refetch,
    } = useExamMonitoringStudentQuery(examId, studentId);

    const [liveProgress, setLiveProgress] = useState<number | null>(null);
    const [isLiveSubmitted, setIsLiveSubmitted] = useState<boolean>(false);

    useMonitoringRealtime({
        examId,
        onProgressUpdate: useCallback(
            (payload: StudentProgressPayload) => {
                if (
                    payload.studentId === studentId ||
                    payload.studentId === student?.id ||
                    payload.studentId === student?.studentRecordId
                ) {
                    setLiveProgress(payload.progress);
                }
            },
            [studentId, student?.id, student?.studentRecordId],
        ),
        onStudentSubmitted: useCallback(
            (payload: StudentSubmittedPayload) => {
                if (
                    payload.studentId === studentId ||
                    payload.studentId === student?.id ||
                    payload.studentId === student?.studentRecordId
                ) {
                    setIsLiveSubmitted(true);
                }
            },
            [studentId, student?.id, student?.studentRecordId],
        ),
    });

    const effectiveStudent = useMemo(() => {
        if (!student) return student;

        const nextStatus = isLiveSubmitted
            ? student.status === 'flagged'
                ? 'flagged'
                : 'submitted'
            : student.status;

        const nextProgress = isLiveSubmitted
            ? 100
            : liveProgress !== null
              ? liveProgress
              : student.progress;

        return {
            ...student,
            progress: nextProgress,
            status: nextStatus,
            lifecycleState: isLiveSubmitted ? ('SUBMITTED' as const) : student.lifecycleState,
        };
    }, [student, liveProgress, isLiveSubmitted]);

    if (isLoading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <Spinner className="text-primary size-8" />
            </div>
        );
    }

    if (isError || !effectiveStudent) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="text-center">
                    <h2 className="text-foreground mb-2 text-2xl font-bold">Student Not Found</h2>
                    <p className="text-muted-foreground">
                        The student you are looking for does not exist or has no recorded attempt.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-6 py-3">
            <StudentMonitoringDetail
                student={effectiveStudent}
                examId={examId}
                onRefresh={() => {
                    void refetch();
                }}
                isRefreshing={isFetching}
            />
        </div>
    );
}

