'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@sentinel/hooks';
import { MOBILE_USER_AGENT_REGEX } from '@sentinel/shared/constants';
import { useTelemetry } from './use-telemetry';
import { useSecurityLock } from './use-security-lock';
import { useInteractionListeners } from './use-interaction-listeners';
import type {
    AttemptMonitoringPhase,
    UseExamMonitoringArgs,
    UseExamMonitoringResult,
} from './_types';

export * from './_types';

/**
 * Hook to monitor student behavior during an exam.
 * Handles tab switches, fullscreen checks, and security locking.
 *
 * @param args - Configuration, session info, and suspension/phase controls.
 * @returns Object containing state (tabSwitches, securityLockReason) and handlers.
 */
export function useExamMonitoring({
    configuration,
    examSessionId,
    examId,
    isMonitoringSuspended = false,
    monitoringPhase = 'active',
}: UseExamMonitoringArgs): UseExamMonitoringResult {
    const { user } = useAuth();
    const [tabSwitches, setTabSwitches] = useState(0);
    const isMonitoringSuspendedRef = useRef(isMonitoringSuspended);
    const monitoringPhaseRef = useRef<AttemptMonitoringPhase>(monitoringPhase);
    const studentId = user?.id;

    const isMobile =
        typeof window !== 'undefined' && MOBILE_USER_AGENT_REGEX.test(window.navigator.userAgent);
    const shouldMonitorVisibility = isMobile
        ? (configuration?.mobileSecurity.prevent_backgrounding ?? true)
        : (configuration?.webSecurity.tab_switching_monitor ?? true);
    const shouldMonitorFullscreen =
        !isMobile && (configuration?.webSecurity.full_screen_required ?? true);
    const resolvedMonitoringSuspended =
        isMonitoringSuspended ||
        monitoringPhase === 'suspended' ||
        monitoringPhase === 'submitting' ||
        monitoringPhase === 'navigating-to-turn-in';

    useEffect(() => {
        monitoringPhaseRef.current = monitoringPhase;
        isMonitoringSuspendedRef.current = resolvedMonitoringSuspended;
    }, [monitoringPhase, resolvedMonitoringSuspended]);

    const { emitTelemetryEvent } = useTelemetry({
        configuration,
        examSessionId,
        studentId,
        isMonitoringSuspended: isMonitoringSuspendedRef,
        isMobile,
    });

    const {
        securityLockReason,
        isResumingExam,
        fullScreenContainerRef,
        lockExam,
        resumeSecuredExam,
        suspendSecurityMonitoring: suspendSecurityMonitoringState,
    } = useSecurityLock({
        examId,
        shouldMonitorFullscreen,
        isMonitoringSuspended: isMonitoringSuspendedRef,
    });

    const suspendSecurityMonitoring = () => {
        if (
            isMonitoringSuspendedRef.current &&
            (monitoringPhaseRef.current === 'suspended' ||
                monitoringPhaseRef.current === 'submitting' ||
                monitoringPhaseRef.current === 'navigating-to-turn-in')
        ) {
            return true;
        }

        monitoringPhaseRef.current = 'suspended';
        isMonitoringSuspendedRef.current = true;
        return suspendSecurityMonitoringState();
    };

    useInteractionListeners({
        configuration,
        examSessionId,
        isMonitoringSuspended: isMonitoringSuspendedRef,
        isMobile,
        shouldMonitorVisibility,
        shouldMonitorFullscreen,
        emitTelemetryEvent,
        lockExam,
        setTabSwitches,
        monitoringPhase: monitoringPhaseRef,
    });

    return {
        tabSwitches,
        isMobile,
        securityLockReason,
        isResumingExam,
        resumeSecuredExam,
        fullScreenContainerRef,
        suspendSecurityMonitoring,
    };
}
