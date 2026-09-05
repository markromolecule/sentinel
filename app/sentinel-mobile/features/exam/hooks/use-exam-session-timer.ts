import { useState, useEffect, useRef, useCallback } from 'react';

interface UseExamSessionTimerOptions {
    duration?: number;
    hasLoadedExam: boolean;
    isSubmitting: boolean;
    onExpire: () => void;
}

export function useExamSessionTimer({
    duration,
    hasLoadedExam,
    isSubmitting,
    onExpire,
}: UseExamSessionTimerOptions) {
    const [timeLeft, setTimeLeft] = useState((duration || 60) * 60);
    const isDurationInitializedRef = useRef(false);
    const timeLeftRef = useRef(timeLeft);
    timeLeftRef.current = timeLeft;

    // Duration sync effect: updates timeLeft once exam details load asynchronously
    useEffect(() => {
        if (!duration || isDurationInitializedRef.current) {
            return;
        }

        setTimeLeft(duration * 60);
        isDurationInitializedRef.current = true;
    }, [duration]);

    // 1-second countdown timer
    useEffect(() => {
        if (!hasLoadedExam) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const next = Math.max(0, prev - 1);
                return next;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [hasLoadedExam]);

    // Check for 00:00 time expiration auto-submit
    useEffect(() => {
        if (!isDurationInitializedRef.current || isSubmitting) {
            return;
        }

        if (timeLeft <= 0) {
            onExpire();
        }
    }, [timeLeft, isSubmitting, onExpire]);

    const formatTime = useCallback((seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        timeLeft,
        timeLeftRef,
        formatTime,
    };
}
