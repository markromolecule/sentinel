import { Suspense } from 'react';
import { StudentExamLoadingState } from '@/app/(protected)/student/exam/[id]/_components/student-exam-loading-state';
import { HistoryDetailsContent } from '@/app/(protected)/student/history/_components/history-details-content';

/**
 * Canonical student history page for a concrete exam attempt.
 *
 * @param props - Route params containing the attempt id.
 * @returns Suspended attempt history details content.
 */
export default async function StudentHistoryAttemptPage({
    params,
}: {
    params: Promise<{ attemptId: string }>;
}) {
    const { attemptId } = await params;

    return (
        <Suspense fallback={<StudentExamLoadingState />}>
            <HistoryDetailsContent attemptId={attemptId} />
        </Suspense>
    );
}
