import { Suspense } from 'react';
import { StudentExamLoadingState } from '@/app/(protected)/student/exam/[id]/_components/student-exam-loading-state';
import { HistoryDetailsContent } from '@/app/(protected)/student/history/_components/history-details-content';

/**
 * Canonical student history page for an exam detail entry without an attempt id.
 *
 * @param props - Route params containing the exam id.
 * @returns Suspended exam history details content.
 */
export default async function StudentHistoryExamPage({
    params,
}: {
    params: Promise<{ examId: string }>;
}) {
    const { examId } = await params;

    return (
        <Suspense fallback={<StudentExamLoadingState />}>
            <HistoryDetailsContent examId={examId} />
        </Suspense>
    );
}
