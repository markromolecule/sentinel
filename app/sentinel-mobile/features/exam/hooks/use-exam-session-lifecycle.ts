import { useEffect, useRef } from 'react';
import { readStoredMobileExamSession } from '@/features/exam/lib/mobile-exam-storage';
import { MobileExamReconnection } from '@/features/exam/lib/mobile-exam-reconnection';

interface UseExamSessionLifecycleOptions {
    id?: string;
    sessionId?: string;
    router: { replace: (url: string) => void };
}

export function useExamSessionLifecycle({
    id,
    sessionId,
    router,
}: UseExamSessionLifecycleOptions) {
    const reconRef = useRef<MobileExamReconnection | null>(null);

    // Initial check: verify active session matches local storage
    useEffect(() => {
        if (!id || !sessionId) {
            return;
        }

        void readStoredMobileExamSession(id).then((storedSession) => {
            if (storedSession?.sessionId !== sessionId) {
                router.replace(`/exam/${id}/lobby`);
            }
        });
    }, [id, sessionId, router]);

    // Reconnection listener
    useEffect(() => {
        if (!id || !sessionId) {
            return;
        }

        const recon = new MobileExamReconnection(
            {
                examId: id,
                sessionId,
            },
            router,
        );

        recon.startListening();
        reconRef.current = recon;

        return () => {
            recon.stopListening();
            reconRef.current = null;
        };
    }, [id, sessionId, router]);

    return {
        reconRef,
    };
}
