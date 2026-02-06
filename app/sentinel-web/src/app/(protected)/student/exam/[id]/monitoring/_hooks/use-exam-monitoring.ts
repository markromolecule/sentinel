"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MOBILE_USER_AGENT_REGEX } from "../_constants";

export function useExamMonitoring() {
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile Detection
  useEffect(() => {
    const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
    setIsMobile(Boolean(userAgent.match(MOBILE_USER_AGENT_REGEX)));
  }, []);

  // Visibility Change Handler
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setTabSwitches((prev) => prev + 1);
      if (isMobile) {
        toast.error("Warning: You left the exam screen!", {
          description: "Incident logged.",
        });
      } else {
        toast.warning("Warning: Navigation detected!", {
          description: "Stay on the exam page.",
        });
      }
    }
  }, [isMobile]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    tabSwitches,
    isMobile,
  };
}
