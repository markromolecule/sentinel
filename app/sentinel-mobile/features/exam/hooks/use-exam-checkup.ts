import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
    buildMobileCalibrationProfile,
    evaluateMobileCheckupFrame,
    isMobileCalibrationStable,
} from '@/features/exam/lib/mobile-mediapipe-calibration';

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
    const [calibrationSamples, setCalibrationSamples] = useState<any[]>([]);

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

    // Auto-calibrate if MediaPipe is not configured for this exam
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
        }
    }, [cameraReady, hasCameraPermission, isCalibrated, exam]);

    // Handle landmarks detected by the camera/WebView bridge
    const handleLandmarksDetected = useCallback((landmarks: any[][], confidenceScore: number) => {
        if (isCalibrated) return;

        const isMediaPipeConfigured = Boolean(
            exam?.mediaPipeSandbox?.enabled &&
            exam?.mediaPipeSandbox?.captureDuringCheckup,
        );

        if (!isMediaPipeConfigured) {
            setIsCalibrated(true);
            setCalibrationProgress(100);
            return;
        }

        const activeConfidenceThreshold = Math.max(
            0.35,
            (exam?.mediaPipeSandbox?.confidenceThreshold ?? 0.6) - 0.15,
        );

        // Run evaluation wrapping evaluateMobileCheckupFrame
        const { evaluation } = evaluateMobileCheckupFrame({
            landmarksByFace: landmarks,
            confidenceThreshold: activeConfidenceThreshold,
            calibrationProfile: null,
        });

        setIsFaceCentered(evaluation.isValid);
        setCalibrationFeedback(
            evaluation.isValid
                ? 'Hold still to calibrate...'
                : (evaluation.details ?? 'Align face in guide')
        );

        if (evaluation.isValid && landmarks[0]) {
            const sample = createMediaPipeCalibrationSample({
                landmarks: landmarks[0],
                confidenceScore: confidenceScore,
            });

            if (sample) {
                setCalibrationSamples((prev) => {
                    const lastSample = prev[prev.length - 1] ?? null;
                    const stable = isMobileCalibrationStable(lastSample, sample);
                    let nextSamples = stable ? [...prev, sample] : prev.slice(0, Math.max(0, prev.length - 2));

                    const REQUIRED_FRAMES = 6;
                    const progress = Math.min(100, Math.round((nextSamples.length / REQUIRED_FRAMES) * 100));
                    setCalibrationProgress(progress);

                    if (nextSamples.length >= REQUIRED_FRAMES) {
                        const profile = buildMobileCalibrationProfile({ samples: nextSamples });
                        if (profile && id) {
                            setCalibrationProfile(profile);
                            setIsCalibrated(true);
                            setCalibrationFeedback(null);
                            void writeStoredMobileCalibrationProfile(id as string, profile);
                        }
                    }
                    return nextSamples;
                });
            }
        } else {
            // Decelerate or reset progress on invalid frames
            setCalibrationSamples((prev) => {
                const nextSamples = prev.slice(0, Math.max(0, prev.length - 2));
                const progress = Math.min(100, Math.round((nextSamples.length / 6) * 100));
                setCalibrationProgress(progress);
                return nextSamples;
            });
        }
    }, [isCalibrated, exam, id]);

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

        if (micDetected) {
            await AsyncStorage.setItem(`sentinel-mobile:audio-ready:${id}`, 'true');
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
        handleLandmarksDetected,
    };
}
