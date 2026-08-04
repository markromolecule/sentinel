'use client';

import Link from 'next/link';
import { StudentExamLoadingState } from '@/app/(protected)/student/exam/[id]/_components/student-exam-loading-state';
import { StudentLiveInspectionBridge } from '@/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge';
import { AttemptView } from '@/app/(protected)/student/exam/[id]/attempt/_components/attempt-view';
import { useStudentExamAttempt } from '@/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt';
import { StudentFlowShell } from '../_components/student-flow-shell';
import { StudentFlowPageHeader } from '../../_components/student-flow-primitives';
import { Button } from '@sentinel/ui';

/**
 * The main container page for a student's active exam attempt.
 *
 * Invokes the attempt coordination hook exactly once at the route boundary
 * to initialize security monitoring, media stream tracking, and audio checks,
 * then passes the unified attempt state down to the render tree.
 */
export default function StudentExamAttemptPage() {
    const attempt = useStudentExamAttempt();
    const { isLoading, isInitializingSession, isRedirectingHistory, blockedState } = attempt;

    if (isLoading || isInitializingSession || isRedirectingHistory) {
        return <StudentExamLoadingState />;
    }

    if (blockedState?.isBlocked) {
        return (
            <StudentFlowShell
                maxWidthClassName="max-w-5xl"
                mainClassName="py-6 sm:py-8"
                contentClassName="my-auto"
            >
                <div className="flex min-h-full flex-col justify-center gap-6">
                    <StudentFlowPageHeader
                        title={blockedState.title ?? 'Exam Unavailable'}
                        description={
                            blockedState.message ?? 'This exam cannot be entered right now.'
                        }
                    />
                    {blockedState.code === 'CLOSED' ? (
                        <div className="flex">
                            <Button asChild size="lg" className="w-fit">
                                <Link href="/student/classroom" replace>
                                    Return to classroom
                                </Link>
                            </Button>
                        </div>
                    ) : null}
                </div>
            </StudentFlowShell>
        );
    }

    return (
        <>
            <StudentLiveInspectionBridge
                sessionId={attempt.examSessionId}
                attemptId={attempt.attemptId}
                enabled={attempt.isLiveInspectionEligible}
            />
            <AttemptView attempt={attempt} />
        </>
    );
}
