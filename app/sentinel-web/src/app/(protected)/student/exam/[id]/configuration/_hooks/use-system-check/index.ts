import { useEffect, useState, RefObject } from "react";
import { toast } from "sonner";
import { MOBILE_USER_AGENT_REGEX } from "../../_constants";
import { UseSystemCheckReturn } from "../../_types";

export function useSystemCheck(videoRef: RefObject<HTMLVideoElement | null>): UseSystemCheckReturn {
     const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
     const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
     const [isMobile, setIsMobile] = useState(false);
     const [stream, setStream] = useState<MediaStream | null>(null);

     useEffect(() => {
          // Detect Mobile
          const checkMobile = () => {
               const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
               const mobile = MOBILE_USER_AGENT_REGEX.test(userAgent);
               setIsMobile(mobile);
          };
          checkMobile();

          // Request Permissions
          const getPermissions = async () => {
               try {
                    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    setStream(mediaStream);
                    setHasCameraPermission(true);
                    setHasMicPermission(true);

                    if (videoRef.current) {
                         videoRef.current.srcObject = mediaStream;
                    }
               } catch (err) {
                    console.error("Error accessing media devices:", err);
                    toast.error("Failed to access camera or microphone. Please allow permissions.");
                    setHasCameraPermission(false);
                    setHasMicPermission(false);
               }
          };

          getPermissions();

          // Cleanup
          return () => {
               if (stream) {
                    stream.getTracks().forEach(track => track.stop());
               }
          };
     }, []); // Dependency array remains empty as per original logic

     // Handle stream cleanup when the component unmounts
     useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
     }, [stream]);

     const allChecksPassed = !!(hasCameraPermission && hasMicPermission);

     return {
          hasCameraPermission,
          hasMicPermission,
          isMobile,
          stream,
          allChecksPassed
     };
}
