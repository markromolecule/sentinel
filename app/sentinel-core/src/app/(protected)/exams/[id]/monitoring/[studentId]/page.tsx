'use client';

import { useExamMonitoringStudentQuery } from '@sentinel/hooks';
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

    if (isLoading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <Spinner className="text-primary size-8" />
            </div>
        );
    }

    if (isError || !student) {
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
                student={student}
                examId={examId}
                onRefresh={() => {
                    void refetch();
                }}
                isRefreshing={isFetching}
            />
        </div>
    );
}
