"use client";

import { useState, useEffect, useCallback } from "react";
import { LOW_TIME_THRESHOLD_SECONDS } from "../_constants";

export function useExamTimer(initialSeconds: number) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const isLowTime = timeLeft < LOW_TIME_THRESHOLD_SECONDS;

  return {
    timeLeft,
    formatTime,
    isLowTime,
  };
}
