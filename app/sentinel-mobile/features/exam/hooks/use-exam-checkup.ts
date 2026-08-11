import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from 'expo-audio';
import { useCameraPermissions } from 'expo-camera';
import { Colors } from '@/constants/theme';
import { useExamQuery } from '@sentinel/hooks';
import { type CameraFacing, type UseExamCheckupReturn } from '@/types/exam';
import { adaptExamForMobile } from '@/features/exam/lib/mobile-exam-adapter';
import { createMediaPipeCalibrationSample } from '@sentinel/shared';
import {
    readStoredMobileCalibrationProfile,
    writeStoredMobileCalibrationProfile,
} from '@/features/exam/lib/mobile-exam-storage';
import { buildMobileCalibrationProfile } from '@/features/exam/lib/mobile-mediapipe-calibration';

const MIC_THRESHOLD = 0.15;
const METERING_INTERVAL = 150;

export function useExamCheckup(): UseExamCheckupReturn {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    const { data: rawExam } = useExamQuery(typeof id === 'string' ? id : undefined);
    const exam = rawExam ? adaptExamForMobile(rawExam) : undefined;
    const requiresCamera = exam?.configuration?.cameraRequired ?? true;
    const requiresMicrophone = exam?.configuration?.micRequired ?? true;

    const [permission, requestPermission] = useCameraPermissions();
    const [cameraFacing, setCameraFacing] = useState<CameraFacing>('front');
    const [cameraReady, setCameraReady] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const [micDetected, setMicDetected] = useState(false);
    const [isStartingSession] = useState(false);

    const [calibrationProgress, setCalibrationProgress] = useState(0);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [calibrationFeedback, setCalibrationFeedback] = useState<string | null>(null);
    const [calibrationProfile, setCalibrationProfile] = useState<any | null>(null);
    const [isFaceCentered, setIsFaceCentered] = useState(false);

    const hasCameraPermission = permission?.granted ?? false;
    const isPermissionLoading = permission === null;

    // ── Camera Permissions ──
    useEffect(() => {
        if (requiresCamera && permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission, requestPermission, requiresCamera]);

    // Safety fallback timer: Ensure cameraReady resolves if permission is granted but native event is delayed/missed
    useEffect(() => {
        if (!requiresCamera || !hasCameraPermission || cameraReady) return;
        const timer = setTimeout(() => {
            setCameraReady(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, [requiresCamera, hasCameraPermission, cameraReady]);

    // ── Audio Recorder Setup ──
    const audioRecorder = useAudioRecorder(
        {
            ...RecordingPresets.HIGH_QUALITY,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            isMeteringEnabled: true,
        },
        (status) => {
            // Optional: handle status changes here if needed
            console.log('Recording status update:', status);
        },
    );

    const recorderState = useAudioRecorderState(audioRecorder, METERING_INTERVAL);

    // ── Audio Processing ──
    useEffect(() => {
        // Debug logging for any state change
        // console.log('Recorder State Update:', JSON.stringify(recorderState, null, 2));

        // Guard against undefined metering or extreme silence floor (-160 is common default)
        if (recorderState.metering === undefined || recorderState.metering <= -160) {
            // setMicLevel(0); // Optional: keep level 0 if silent
            // Don't return early if you want to see if duration is updating in other logs?
            // But for level setting we accept it.
        }

        const db = recorderState.metering ?? -160;

        // Normalize typical dB range (approx -60dB noise floor to 0dB peak) to 0-1
        const normalized = Math.max(0, Math.min(1, (db + 60) / 60));

        setMicLevel(normalized);

        if (normalized > MIC_THRESHOLD) {
            if (!micDetected) {
                // console.log('Microphone detected input!');
                setMicDetected(true);
            }
        }
    }, [recorderState]);

    // ── Audio Controls ──
    const startMicMetering = useCallback(async () => {
        if (!requiresMicrophone) {
            setMicDetected(true);
            return;
        }

        try {
            const status = await AudioModule.requestRecordingPermissionsAsync();
            if (!status.granted) {
                console.warn('Audio recording permission denied:', status);
                return;
            }

            // Important: iOS requires setting the audio mode before recording
            await AudioModule.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
                interruptionMode: 'doNotMix',
                shouldPlayInBackground: false,
            });

            if (!audioRecorder.isRecording) {
                try {
                    // Explicitly prepare the recorder now that permissions are granted
                    await audioRecorder.prepareToRecordAsync({
                        ...RecordingPresets.HIGH_QUALITY,
                        sampleRate: 44100,
                        numberOfChannels: 1,
                        bitRate: 128000,
                        isMeteringEnabled: true,
                    });
                    audioRecorder.record();
                    // console.log('Audio recording started.');
                } catch (e) {
                    console.error('Error starting audio recording:', e);
                }
            }
        } catch (error) {
            console.error('Failed to start recording sequence:', error);
        }
    }, [audioRecorder, requiresMicrophone]);

    const stopMicMetering = useCallback(async () => {
        try {
            if (audioRecorder.isRecording) {
                await audioRecorder.stop();
            }
        } catch (error) {
            console.log('Error stopping microphone:', error);
        }
    }, [audioRecorder]);

    // ── Lifecycle Management ──
    useEffect(() => {
        startMicMetering();

        // FIX APPLIED:
        // We removed the cleanup function that calls `stopMicMetering`.
        // The `useAudioRecorder` hook automatically cleans up the native object on unmount.
        // Calling .stop() here causes the "NativeSharedObjectNotFoundException".
    }, [startMicMetering]);

    // Load stored calibration profile on mount
    useEffect(() => {
        if (!id) return;
        readStoredMobileCalibrationProfile(id as string).then((profile) => {
            if (profile) {
                setCalibrationProfile(profile);
                setIsCalibrated(true);
                setCalibrationProgress(100);
            }
        });
    }, [id]);

    // Handle calibration simulation
    useEffect(() => {
        if (!cameraReady || !hasCameraPermission || isCalibrated) {
            return;
        }

        const isMediaPipeConfigured = Boolean(
            exam?.mediaPipeSandbox?.enabled &&
            exam?.mediaPipeSandbox?.captureDuringCheckup,
        );

        if (!isMediaPipeConfigured) {
            setIsCalibrated(true);
            setCalibrationProgress(100);
            return;
        }

        setIsFaceCentered(true);
        setCalibrationFeedback('Hold still to calibrate...');

        let currentFrames = 0;
        const requiredFrames = 6;

        const interval = setInterval(() => {
            currentFrames += 1;
            const progress = Math.min(100, Math.round((currentFrames / requiredFrames) * 100));
            setCalibrationProgress(progress);

            if (currentFrames >= requiredFrames) {
                clearInterval(interval);
                setIsFaceCentered(true);
                setCalibrationFeedback(null);
                setIsCalibrated(true);

                // Build and write profile
                const mockLandmarks = Array.from({ length: 478 }, () => ({
                    x: 0.5,
                    y: 0.45,
                    z: 0,
                }));
                mockLandmarks[160] = { x: 0.41, y: 0.452, z: 0 };
                mockLandmarks[159] = { x: 0.43, y: 0.451, z: 0 };
                mockLandmarks[158] = { x: 0.45, y: 0.452, z: 0 };
                mockLandmarks[144] = { x: 0.41, y: 0.468, z: 0 };
                mockLandmarks[145] = { x: 0.43, y: 0.469, z: 0 };
                mockLandmarks[153] = { x: 0.45, y: 0.468, z: 0 };
                mockLandmarks[387] = { x: 0.55, y: 0.452, z: 0 };
                mockLandmarks[386] = { x: 0.57, y: 0.451, z: 0 };
                mockLandmarks[385] = { x: 0.59, y: 0.452, z: 0 };
                mockLandmarks[373] = { x: 0.55, y: 0.468, z: 0 };
                mockLandmarks[374] = { x: 0.57, y: 0.469, z: 0 };
                mockLandmarks[380] = { x: 0.59, y: 0.468, z: 0 };
                [468, 469, 470, 471, 472].forEach((index) => {
                    mockLandmarks[index] = { x: 0.43, y: 0.46, z: 0 };
                });
                [473, 474, 475, 476, 477].forEach((index) => {
                    mockLandmarks[index] = { x: 0.57, y: 0.46, z: 0 };
                });

                const sample = createMediaPipeCalibrationSample({
                    landmarks: mockLandmarks,
                    confidenceScore: 0.95,
                });
                if (sample) {
                    const profile = buildMobileCalibrationProfile({ samples: [sample] });
                    if (profile && id) {
                        setCalibrationProfile(profile);
                        void writeStoredMobileCalibrationProfile(id as string, profile);
                    }
                }
            }
        }, 500);

        return () => {
            clearInterval(interval);
        };
    }, [cameraReady, hasCameraPermission, isCalibrated, exam, id]);

    // ── Camera Handlers ──
    const onCameraReady = () => setCameraReady(true);
    const onCameraMountError = (error: any) => {
        console.warn('Camera failed to mount:', error);
        setCameraReady(true);
    };
    const flipCamera = () => {
        setCameraReady(false);
        setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
    };

    // ── Navigation Handlers ──
    const handleGoBack = async () => {
        // It's safe to stop manually on user interaction (button press)
        await stopMicMetering();
        router.back();
    };

    const handleStartExam = async () => {
        if (!exam) return;

        const isMediaPipeConfigured = Boolean(
            exam.mediaPipeSandbox?.enabled &&
            exam.mediaPipeSandbox?.captureDuringCheckup,
        );

        if (isMediaPipeConfigured && !isCalibrated) {
            return;
        }

        await stopMicMetering();
        router.push(`/exam/${id}/lobby`);
    };

    return {
        exam,
        colors,
        isDark,
        insets,
        cameraFacing,
        cameraReady,
        hasCameraPermission,
        isPermissionLoading,
        requestCameraPermission: requestPermission,
        micLevel,
        micDetected,
        requiresCamera,
        requiresMicrophone,
        isStartingSession,
        onCameraReady,
        onCameraMountError,
        flipCamera,
        handleGoBack,
        handleStartExam,
        calibrationProgress,
        isCalibrated,
        calibrationFeedback,
        calibrationProfile,
        isFaceCentered,
    };
}
