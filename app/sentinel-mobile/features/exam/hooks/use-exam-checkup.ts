import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from 'expo-audio';
import { useCameraPermissions } from 'expo-camera';
import { Colors } from '@/constants/theme';
import { mockExams } from '@/data/exams';
import { type CameraFacing, type UseExamCheckupReturn } from '@/features/exam/types';

const MIC_THRESHOLD = 0.15;
const METERING_INTERVAL = 150;

export function useExamCheckup(): UseExamCheckupReturn {
     const router = useRouter();
     const { id } = useLocalSearchParams();
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];
     const isDark = colorScheme === 'dark';
     const insets = useSafeAreaInsets();

     const exam = mockExams.find((e) => e.id === id);

     const [permission, requestPermission] = useCameraPermissions();
     const [cameraFacing, setCameraFacing] = useState<CameraFacing>('front');
     const [cameraReady, setCameraReady] = useState(false);
     const [micLevel, setMicLevel] = useState(0);
     const [micDetected, setMicDetected] = useState(false);

     // ── Camera Permissions ──
     useEffect(() => {
          if (permission && !permission.granted && permission.canAskAgain) {
               requestPermission();
          }
     }, [permission, requestPermission]);

     // ── Audio Recorder Setup ──
     const audioRecorder = useAudioRecorder({
          ...RecordingPresets.HIGH_QUALITY,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          isMeteringEnabled: true,
     }, (status) => {
          // Optional: handle status changes here if needed
          console.log('Recording status update:', status);
     });

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
     }, [audioRecorder]);

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

     // ── Camera Handlers ──
     const onCameraReady = () => setCameraReady(true);
     const flipCamera = () =>
          setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));

     // ── Navigation Handlers ──
     const handleGoBack = async () => {
          // It's safe to stop manually on user interaction (button press)
          await stopMicMetering();
          router.back();
     };

     const handleStartExam = async () => {
          // Stop metering before navigating to the actual exam to release the mic
          await stopMicMetering();
          console.log('Navigating to exam session...');
          // Add your navigation logic here, e.g.:
          // router.push(`/exam/${id}/session`);
     };

     return {
          exam,
          colors,
          isDark,
          insets,
          cameraFacing,
          cameraReady,
          micLevel,
          micDetected,
          onCameraReady,
          flipCamera,
          handleGoBack,
          handleStartExam,
     };
}