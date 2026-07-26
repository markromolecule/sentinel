'use client';

import { Eye } from 'lucide-react';
import { useApi, useAuth, useStudentLiveInspectionPublisher } from '@sentinel/hooks';
import { useStudentExamMediaPipeStream } from './student-exam-mediapipe-provider';

type StudentLiveInspectionBridgeProps = {
    sessionId: string | null;
    attemptId: string | null;
    enabled: boolean;
};

export function StudentLiveInspectionBridge({
    sessionId,
    attemptId,
    enabled,
}: StudentLiveInspectionBridgeProps) {
    const apiClient = useApi();
    const { supabase } = useAuth();
    const { getLiveVideoTrack } = useStudentExamMediaPipeStream();
    const publisher = useStudentLiveInspectionPublisher({
        supabase,
        apiClient,
        sessionId,
        attemptId,
        enabled,
        getLiveVideoTrack,
    });

    if (!publisher.isLive) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            data-testid="live-inspection-status"
            className="border-border bg-background/95 text-foreground pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+10rem)] left-1/2 z-40 flex w-[calc(100vw-1.5rem)] max-w-80 -translate-x-1/2 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-[11px] leading-tight font-semibold shadow-lg backdrop-blur sm:right-4 sm:bottom-[calc(env(safe-area-inset-bottom)+7rem)] sm:left-auto sm:w-auto sm:max-w-xs sm:translate-x-0 sm:justify-start sm:rounded-full sm:px-4 sm:text-left sm:text-xs lg:bottom-[calc(env(safe-area-inset-bottom)+6rem)]"
        >
            <Eye className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">Camera being viewed live by an authorized proctor</span>
        </div>
    );
}
